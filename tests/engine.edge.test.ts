import { describe, expect, it } from 'vitest';
import { Scheduler } from '../src/engine/scheduler';
import { StatsEngine } from '../src/engine/stats';
import { InMemoryRepo } from '../src/infra/memoryRepo';

function fixedClock(now: Date) {
  return { now: () => now };
}

describe('Scheduler edge cases', () => {
  it('double-booking: segundo book en slot ocupado lanza Error', () => {
    const repo = new InMemoryRepo(false);
    const clock = fixedClock(new Date('2026-05-30T10:00:00.000Z'));
    const scheduler = new Scheduler(repo, clock);

    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cliA = { id: 'cli-a', name: 'A', phone: '111' };
    const cliB = { id: 'cli-b', name: 'B', phone: '222' };
    repo.saveClient(cliA);
    repo.saveClient(cliB);

    const start = new Date('2099-01-01T10:00:00.000Z');
    scheduler.book(cliA.id, svc.id, start);

    expect(() => scheduler.book(cliB.id, svc.id, start)).toThrow('Slot overlaps');
  });

  it('cancelar sin waitlist devuelve candidates vacío', () => {
    const repo = new InMemoryRepo(false);
    const clock = fixedClock(new Date('2026-05-30T10:00:00.000Z'));
    const scheduler = new Scheduler(repo, clock);

    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    const start = new Date('2099-01-01T10:00:00.000Z');
    const appt = scheduler.book(cli.id, svc.id, start);

    const { freed, candidates } = scheduler.cancel(appt.id);
    expect(freed.start).toBe(start.toISOString());
    expect(candidates).toHaveLength(0);
  });

  it('reagendar a slot ocupado lanza Error', () => {
    const repo = new InMemoryRepo(false);
    const clock = fixedClock(new Date('2026-05-30T10:00:00.000Z'));
    const scheduler = new Scheduler(repo, clock);

    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cliA = { id: 'cli-a', name: 'A', phone: '111' };
    const cliB = { id: 'cli-b', name: 'B', phone: '222' };
    repo.saveClient(cliA);
    repo.saveClient(cliB);

    const startA = new Date('2099-01-01T10:00:00.000Z');
    const startB = new Date('2099-01-01T12:00:00.000Z');
    const apptA = scheduler.book(cliA.id, svc.id, startA);
    scheduler.book(cliB.id, svc.id, startB);

    expect(() => scheduler.reschedule(apptA.id, startB)).toThrow('Slot overlaps');
  });

  it('ventana de waitlist que NO contiene el slot liberado no aparece en candidates', () => {
    const repo = new InMemoryRepo(false);
    const clock = fixedClock(new Date('2026-05-30T10:00:00.000Z'));
    const scheduler = new Scheduler(repo, clock);

    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    const start = new Date('2099-01-01T10:00:00.000Z');
    const appt = scheduler.book(cli.id, svc.id, start);

    // Ventana completamente antes del slot liberado
    repo.saveWaitlistEntry({
      id: 'w-early',
      clientId: 'cli-w',
      serviceId: svc.id,
      windowStart: '2099-01-01T06:00:00.000Z',
      windowEnd: '2099-01-01T07:00:00.000Z',
      createdAt: '2026-05-30T10:00:00.000Z',
    });

    // Ventana completamente después del slot liberado
    repo.saveWaitlistEntry({
      id: 'w-late',
      clientId: 'cli-w2',
      serviceId: svc.id,
      windowStart: '2099-01-01T14:00:00.000Z',
      windowEnd: '2099-01-01T15:00:00.000Z',
      createdAt: '2026-05-30T10:00:00.000Z',
    });

    const { candidates } = scheduler.cancel(appt.id);
    const ids = candidates.map((c) => c.id);
    expect(ids).not.toContain('w-early');
    expect(ids).not.toContain('w-late');
    expect(candidates).toHaveLength(0);
  });
});

describe('StatsEngine edge cases', () => {
  it('rango vacío devuelve todos los contadores en 0', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-ana', name: 'Ana', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({
      id: 'appt-1', clientId: cli.id, serviceId: svc.id,
      start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T11:00:00.000Z', status: 'booked',
    });

    const stats = engine.compute(
      new Date('2099-02-01T00:00:00.000Z'),
      new Date('2099-02-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(0);
    expect(stats.cancellationRate).toBe(0);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.topServicesByBookings).toHaveLength(0);
    expect(stats.topServicesByCancellations).toHaveLength(0);
    expect(stats.topClientsByVisits).toHaveLength(0);
  });

  it('todo cancelado: cancellationRate=1, occupancyRate=0', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-ana', name: 'Ana', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({
      id: 'appt-1', clientId: cli.id, serviceId: svc.id,
      start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T11:00:00.000Z', status: 'cancelled',
    });
    repo.saveAppointment({
      id: 'appt-2', clientId: cli.id, serviceId: svc.id,
      start: '2099-01-01T12:00:00.000Z', end: '2099-01-01T13:00:00.000Z', status: 'cancelled',
    });

    const stats = engine.compute(
      new Date('2099-01-01T00:00:00.000Z'),
      new Date('2099-01-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(2);
    expect(stats.appointmentsCancelled).toBe(2);
    expect(stats.cancellationRate).toBe(1);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.topServicesByBookings).toHaveLength(0);
  });

  it('rango parcial de día laborable calcula minutos laborables correctos', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-ana', name: 'Ana', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({
      id: 'appt-1', clientId: cli.id, serviceId: svc.id,
      start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T11:00:00.000Z', status: 'booked',
    });

    // Rango de 4 horas dentro del día laborable: 10:00 -> 14:00 = 240 minutos laborables
    const stats = engine.compute(
      new Date('2099-01-01T10:00:00.000Z'),
      new Date('2099-01-01T14:00:00.000Z'),
    );

    expect(stats.occupancyRate).toBe(Math.round((60 / 240) * 10000) / 10000);
  });

  it('empate en tops resuelto establemente por id', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svcA = { id: 'svc-a', name: 'A', durationMin: 30, priceCents: 100, upsells: [] };
    const svcB = { id: 'svc-b', name: 'B', durationMin: 30, priceCents: 100, upsells: [] };
    const svcC = { id: 'svc-c', name: 'C', durationMin: 30, priceCents: 100, upsells: [] };
    repo.saveService(svcA);
    repo.saveService(svcB);
    repo.saveService(svcC);

    const cliX = { id: 'cli-x', name: 'X', phone: '111' };
    const cliY = { id: 'cli-y', name: 'Y', phone: '222' };
    repo.saveClient(cliX);
    repo.saveClient(cliY);

    // svc-b y svc-a tienen 2 bookings; svc-c tiene 1
    repo.saveAppointment({ id: 'a1', clientId: cliX.id, serviceId: svcB.id, start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T10:30:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'a2', clientId: cliX.id, serviceId: svcB.id, start: '2099-01-01T11:00:00.000Z', end: '2099-01-01T11:30:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'a3', clientId: cliY.id, serviceId: svcA.id, start: '2099-01-01T12:00:00.000Z', end: '2099-01-01T12:30:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'a4', clientId: cliY.id, serviceId: svcA.id, start: '2099-01-01T13:00:00.000Z', end: '2099-01-01T13:30:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'a5', clientId: cliX.id, serviceId: svcC.id, start: '2099-01-01T14:00:00.000Z', end: '2099-01-01T14:30:00.000Z', status: 'booked' });

    const stats = engine.compute(
      new Date('2099-01-01T00:00:00.000Z'),
      new Date('2099-01-02T00:00:00.000Z'),
    );

    expect(stats.topServicesByBookings).toHaveLength(3);
    // svc-a y svc-b empatan con 2 -> tie-break por id ascendente
    expect(stats.topServicesByBookings[0].serviceId).toBe('svc-a');
    expect(stats.topServicesByBookings[1].serviceId).toBe('svc-b');
    expect(stats.topServicesByBookings[2].serviceId).toBe('svc-c');
  });
});
