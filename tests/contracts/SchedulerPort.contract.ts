// Contract tests para SchedulerPort.
// Esta es la SPEC EJECUTABLE de la interfaz: cualquier implementación
// debe pasar estos tests. Si tu Scheduler no pasa, está mal por definición.
//
// Uso desde la suite del agente Dev Motor:
//   import { schedulerPortContract } from './contracts/SchedulerPort.contract';
//   import { Scheduler } from '../src/engine/scheduler';
//   schedulerPortContract(() => new Scheduler(new InMemoryRepo(), new SystemClock()));

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import type { Clock, Repository, SchedulerPort } from '../../src/domain/ports';
import type { WaitlistEntry } from '../../src/domain/types';

export interface SchedulerFactory {
  scheduler: SchedulerPort;
  repo: Repository;
  clock: Clock;
}

// Helpers para construir entidades de test válidas.
const ISO = (d: Date) => d.toISOString();
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

/**
 * Suite de contrato. Pasar una factory que devuelva un Scheduler fresco
 * (con repo sembrado o vacío + clock controlable) por cada test.
 */
export function schedulerPortContract(makeSut: () => SchedulerFactory) {
  describe('SchedulerPort — contract', () => {
    // ---------- book ----------
    it('book en slot libre crea Appointment con status="booked"', () => {
      const { scheduler, repo } = makeSut();
      const svc = repo.listServices()[0];
      const cli = repo.listClients()[0];
      const start = new Date('2099-01-01T10:00:00.000Z'); // futuro lejano, libre
      const appt = scheduler.book(cli.id, svc.id, start);
      expect(appt.status).toBe('booked');
      expect(appt.clientId).toBe(cli.id);
      expect(appt.serviceId).toBe(svc.id);
      expect(appt.start).toBe(ISO(start));
      expect(appt.end).toBe(ISO(addMin(start, svc.durationMin)));
    });

    it('book en slot solapado LANZA Error', () => {
      const { scheduler, repo } = makeSut();
      const svc = repo.listServices()[0];
      const cli = repo.listClients()[0];
      const start = new Date('2099-01-02T10:00:00.000Z');
      scheduler.book(cli.id, svc.id, start);
      expect(() => scheduler.book(cli.id, svc.id, addMin(start, 1))).toThrow();
      expect(() => scheduler.book(cli.id, svc.id, addMin(start, svc.durationMin - 1))).toThrow();
    });

    it('property: dos books con rangos disjuntos no se interfieren', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 8 }), fc.integer({ min: 10, max: 20 }), (h1, h2) => {
          const { scheduler, repo } = makeSut();
          const svc = repo.listServices()[0];
          const cli = repo.listClients()[0];
          // dos slots claramente disjuntos en el mismo día
          const t1 = new Date(`2099-03-01T0${h1}:00:00.000Z`);
          const t2 = new Date(`2099-03-01T${h2}:00:00.000Z`);
          expect(() => scheduler.book(cli.id, svc.id, t1)).not.toThrow();
          expect(() => scheduler.book(cli.id, svc.id, t2)).not.toThrow();
        }),
      );
    });

    // ---------- cancel ----------
    it('cancel marca la cita "cancelled" y la devuelve liberada', () => {
      const { scheduler, repo } = makeSut();
      const svc = repo.listServices()[0];
      const cli = repo.listClients()[0];
      const start = new Date('2099-04-01T10:00:00.000Z');
      const appt = scheduler.book(cli.id, svc.id, start);
      const { freed } = scheduler.cancel(appt.id);
      expect(freed.start).toBe(appt.start);
      expect(freed.end).toBe(appt.end);
      expect(repo.getAppointment(appt.id)?.status).toBe('cancelled');
    });

    // ---------- backfill (FIFO + filtros) ----------
    it('cancel devuelve candidates ordenados FIFO por createdAt ASC', () => {
      const { scheduler, repo } = makeSut();
      const svc = repo.listServices()[0];
      const cli = repo.listClients()[0];
      const start = new Date('2099-05-01T10:00:00.000Z');
      const winS = ISO(addMin(start, -120));
      const winE = ISO(addMin(start, 120));
      // 3 entradas FIFO desordenadas
      const entries: WaitlistEntry[] = [
        { id: 'w-c', clientId: 'cli-c', serviceId: svc.id, windowStart: winS, windowEnd: winE, createdAt: '2026-05-30T12:00:00.000Z' },
        { id: 'w-a', clientId: 'cli-a', serviceId: svc.id, windowStart: winS, windowEnd: winE, createdAt: '2026-05-30T10:00:00.000Z' },
        { id: 'w-b', clientId: 'cli-b', serviceId: svc.id, windowStart: winS, windowEnd: winE, createdAt: '2026-05-30T11:00:00.000Z' },
      ];
      entries.forEach((e) => repo.saveWaitlistEntry(e));
      const appt = scheduler.book(cli.id, svc.id, start);
      const { candidates } = scheduler.cancel(appt.id);
      const ids = candidates.map((c) => c.id);
      // los preexistentes (sembrados por InMemoryRepo) pueden estar también; verificamos
      // que el orden relativo de a/b/c es FIFO
      expect(ids.indexOf('w-a')).toBeLessThan(ids.indexOf('w-b'));
      expect(ids.indexOf('w-b')).toBeLessThan(ids.indexOf('w-c'));
    });

    it('cancel filtra candidates por serviceId (los de OTRO servicio NO aparecen)', () => {
      const { scheduler, repo } = makeSut();
      const services = repo.listServices();
      expect(services.length).toBeGreaterThanOrEqual(2);
      const [svcA, svcB] = services;
      const cli = repo.listClients()[0];
      const start = new Date('2099-06-01T10:00:00.000Z');
      const win = { windowStart: ISO(addMin(start, -120)), windowEnd: ISO(addMin(start, 120)) };
      repo.saveWaitlistEntry({ id: 'w-match', clientId: 'cli-x', serviceId: svcA.id, ...win, createdAt: '2026-05-30T10:00:00.000Z' });
      repo.saveWaitlistEntry({ id: 'w-other', clientId: 'cli-y', serviceId: svcB.id, ...win, createdAt: '2026-05-30T10:00:00.000Z' });
      const appt = scheduler.book(cli.id, svcA.id, start);
      const { candidates } = scheduler.cancel(appt.id);
      const ids = candidates.map((c) => c.id);
      expect(ids).toContain('w-match');
      expect(ids).not.toContain('w-other');
    });

    it('cancel filtra candidates por ventana (ventana fuera del slot liberado NO matchea)', () => {
      const { scheduler, repo } = makeSut();
      const svc = repo.listServices()[0];
      const cli = repo.listClients()[0];
      const start = new Date('2099-07-01T10:00:00.000Z');
      // ventana fuera del slot
      repo.saveWaitlistEntry({
        id: 'w-out',
        clientId: 'cli-out',
        serviceId: svc.id,
        windowStart: ISO(addMin(start, 200)),
        windowEnd: ISO(addMin(start, 300)),
        createdAt: '2026-05-30T10:00:00.000Z',
      });
      // ventana que sí contiene el slot
      repo.saveWaitlistEntry({
        id: 'w-in',
        clientId: 'cli-in',
        serviceId: svc.id,
        windowStart: ISO(addMin(start, -60)),
        windowEnd: ISO(addMin(start, 120)),
        createdAt: '2026-05-30T10:00:00.000Z',
      });
      const appt = scheduler.book(cli.id, svc.id, start);
      const { candidates } = scheduler.cancel(appt.id);
      const ids = candidates.map((c) => c.id);
      expect(ids).toContain('w-in');
      expect(ids).not.toContain('w-out');
    });

    // ---------- reminders ----------
    it('book agenda un ReminderJob (algún reminder existe tras book)', () => {
      const { scheduler, repo } = makeSut();
      const svc = repo.listServices()[0];
      const cli = repo.listClients()[0];
      const before = repo.listReminders().length;
      scheduler.book(cli.id, svc.id, new Date('2099-08-01T10:00:00.000Z'));
      expect(repo.listReminders().length).toBeGreaterThan(before);
    });

    it('dueReminders respeta el Clock — solo dueAt<=now y sent=false', () => {
      const { scheduler, repo } = makeSut();
      const svc = repo.listServices()[0];
      const cli = repo.listClients()[0];
      const start = new Date('2099-09-01T10:00:00.000Z');
      scheduler.book(cli.id, svc.id, start);
      // fecha futurísima: todos los reminders ya están vencidos
      const future = new Date('3000-01-01T00:00:00.000Z');
      const due = scheduler.dueReminders(future);
      expect(due.every((r) => !r.sent)).toBe(true);
      // fecha pasadísima: ninguno debería estar vencido
      const past = new Date('1900-01-01T00:00:00.000Z');
      expect(scheduler.dueReminders(past).length).toBe(0);
    });
  });
}
