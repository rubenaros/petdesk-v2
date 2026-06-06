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
  it('rango vacío devuelve todas las métricas en cero', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const stats = engine.compute('2099-01-01T00:00:00.000Z', '2099-01-02T00:00:00.000Z');

    expect(stats.appointmentsTotal).toBe(0);
    expect(stats.appointmentsBooked).toBe(0);
    expect(stats.appointmentsCompleted).toBe(0);
    expect(stats.appointmentsCancelled).toBe(0);
    expect(stats.cancellationRate).toBe(0);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.topServicesByBookings).toEqual([]);
    expect(stats.topServicesByCancellations).toEqual([]);
    expect(stats.topClientsByVisits).toEqual([]);
  });

  it('todo cancelado: occupancyRate=0, cancellationRate=1', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svc = { id: 'svc-a', name: 'A', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-x', name: 'X', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({
      id: 'appt-1', clientId: cli.id, serviceId: svc.id,
      start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T11:00:00.000Z', status: 'cancelled',
    });

    const stats = engine.compute('2099-01-01T00:00:00.000Z', '2099-01-02T00:00:00.000Z');

    expect(stats.appointmentsTotal).toBe(1);
    expect(stats.cancellationRate).toBe(1);
    expect(stats.occupancyRate).toBe(0);
  });

  it('empates en tops se resuelven por id ascendente', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svcA = { id: 'svc-a', name: 'A', durationMin: 60, priceCents: 100, upsells: [] };
    const svcB = { id: 'svc-b', name: 'B', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svcA);
    repo.saveService(svcB);

    const cliX = { id: 'cli-x', name: 'X', phone: '111' };
    const cliY = { id: 'cli-y', name: 'Y', phone: '222' };
    repo.saveClient(cliX);
    repo.saveClient(cliY);

    repo.saveAppointment({
      id: 'appt-1', clientId: cliX.id, serviceId: svcB.id,
      start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T11:00:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-2', clientId: cliY.id, serviceId: svcA.id,
      start: '2099-01-01T12:00:00.000Z', end: '2099-01-01T13:00:00.000Z', status: 'booked',
    });

    const stats = engine.compute('2099-01-01T00:00:00.000Z', '2099-01-02T00:00:00.000Z');

    // svc-a y svc-b tienen count=1 → tie-break por id: svc-a antes que svc-b
    expect(stats.topServicesByBookings[0].serviceId).toBe('svc-a');
    expect(stats.topServicesByBookings[1].serviceId).toBe('svc-b');

    // cli-x y cli-y tienen count=1 → tie-break por id: cli-x antes que cli-y
    expect(stats.topClientsByVisits[0].clientId).toBe('cli-x');
    expect(stats.topClientsByVisits[1].clientId).toBe('cli-y');
  });

  it('ocupación parcial en un solo día', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svc = { id: 'svc-a', name: 'A', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-x', name: 'X', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({
      id: 'appt-1', clientId: cli.id, serviceId: svc.id,
      start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T11:00:00.000Z', status: 'booked',
    });

    const stats = engine.compute('2099-01-01T00:00:00.000Z', '2099-01-02T00:00:00.000Z');

    // 60 min ocupados / 540 min laborables = 0.1111...
    expect(stats.occupancyRate).toBe(Number((60 / 540).toFixed(4)));
  });
});
