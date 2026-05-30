import { describe, expect, it } from 'vitest';
import { Scheduler } from '../src/engine/scheduler';
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
