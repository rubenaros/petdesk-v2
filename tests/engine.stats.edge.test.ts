import { describe, expect, it } from 'vitest';
import { StatsEngine } from '../src/engine/stats';
import { InMemoryRepo } from '../src/infra/memoryRepo';

describe('StatsEngine edge cases', () => {
  it('empty range returns zero counts, zero rates and empty tops', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const stats = engine.compute(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(0);
    expect(stats.appointmentsBooked).toBe(0);
    expect(stats.appointmentsCompleted).toBe(0);
    expect(stats.appointmentsCancelled).toBe(0);
    expect(stats.cancellationRate).toBe(0);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.topServicesByBookings).toHaveLength(0);
    expect(stats.topServicesByCancellations).toHaveLength(0);
    expect(stats.topClientsByVisits).toHaveLength(0);
  });

  it('all appointments cancelled -> cancellationRate=1 and occupancy=0', () => {
    const repo = new InMemoryRepo(false);
    const svc = { id: 'svc-bath', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({
      id: 'appt-1', clientId: cli.id, serviceId: svc.id,
      start: '2026-03-01T09:00:00.000Z', end: '2026-03-01T10:00:00.000Z', status: 'cancelled',
    });
    repo.saveAppointment({
      id: 'appt-2', clientId: cli.id, serviceId: svc.id,
      start: '2026-03-01T11:00:00.000Z', end: '2026-03-01T12:00:00.000Z', status: 'cancelled',
    });
    repo.saveAppointment({
      id: 'appt-3', clientId: cli.id, serviceId: svc.id,
      start: '2026-03-01T13:00:00.000Z', end: '2026-03-01T14:00:00.000Z', status: 'cancelled',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(3);
    expect(stats.appointmentsCancelled).toBe(3);
    expect(stats.cancellationRate).toBe(1);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.topServicesByBookings).toHaveLength(0);
    expect(stats.topClientsByVisits).toHaveLength(0);
    expect(stats.topServicesByCancellations).toEqual([{ serviceId: svc.id, count: 3 }]);
  });

  it('appointment starting before range is excluded even if it ends inside', () => {
    // SUPUESTO: StatsEngine filtra citas por el campo `start` [inclusive, exclusive).
    // Una cita cuyo inicio cae antes del rango NO se cuenta, aunque su `end` entre en el rango.
    const repo = new InMemoryRepo(false);
    const svc = { id: 'svc-bath', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    // Starts before, ends inside
    repo.saveAppointment({
      id: 'appt-cross', clientId: cli.id, serviceId: svc.id,
      start: '2026-04-01T23:00:00.000Z', end: '2026-04-02T01:00:00.000Z', status: 'booked',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-04-02T00:00:00.000Z'),
      new Date('2026-04-03T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(0);
  });

  it('tie in top services and clients resolves by alphabetical id', () => {
    const repo = new InMemoryRepo(false);

    const svcA = { id: 'svc-alpha', name: 'Alpha', durationMin: 30, priceCents: 100, upsells: [] };
    const svcB = { id: 'svc-beta', name: 'Beta', durationMin: 30, priceCents: 100, upsells: [] };
    repo.saveService(svcA);
    repo.saveService(svcB);

    const cliX = { id: 'cli-xavi', name: 'Xavi', phone: '111' };
    const cliY = { id: 'cli-yury', name: 'Yury', phone: '222' };
    repo.saveClient(cliX);
    repo.saveClient(cliY);

    // Each service gets exactly 2 completed -> tie
    repo.saveAppointment({ id: 'a1', clientId: cliX.id, serviceId: svcA.id, start: '2026-05-01T09:00:00.000Z', end: '2026-05-01T09:30:00.000Z', status: 'completed' });
    repo.saveAppointment({ id: 'a2', clientId: cliX.id, serviceId: svcA.id, start: '2026-05-01T10:00:00.000Z', end: '2026-05-01T10:30:00.000Z', status: 'completed' });
    repo.saveAppointment({ id: 'a3', clientId: cliY.id, serviceId: svcB.id, start: '2026-05-01T11:00:00.000Z', end: '2026-05-01T11:30:00.000Z', status: 'completed' });
    repo.saveAppointment({ id: 'a4', clientId: cliY.id, serviceId: svcB.id, start: '2026-05-01T12:00:00.000Z', end: '2026-05-01T12:30:00.000Z', status: 'completed' });

    // Tie in services by cancellations as well
    repo.saveAppointment({ id: 'a5', clientId: cliX.id, serviceId: svcA.id, start: '2026-05-01T13:00:00.000Z', end: '2026-05-01T13:30:00.000Z', status: 'cancelled' });
    repo.saveAppointment({ id: 'a6', clientId: cliY.id, serviceId: svcB.id, start: '2026-05-01T14:00:00.000Z', end: '2026-05-01T14:30:00.000Z', status: 'cancelled' });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-02T00:00:00.000Z'),
    );

    expect(stats.topServicesByBookings).toEqual([
      { serviceId: 'svc-alpha', count: 2 },
      { serviceId: 'svc-beta', count: 2 },
    ]);
    expect(stats.topServicesByCancellations).toEqual([
      { serviceId: 'svc-alpha', count: 1 },
      { serviceId: 'svc-beta', count: 1 },
    ]);

    // Clients tie: Xavi has 2 completed, Yuri has 2 completed
    expect(stats.topClientsByVisits).toEqual([
      { clientId: 'cli-xavi', count: 2 },
      { clientId: 'cli-yury', count: 2 },
    ]);
  });

  it('partial day range still counts appointments whose start falls inside', () => {
    const repo = new InMemoryRepo(false);
    const svc = { id: 'svc-bath', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({
      id: 'appt-morning', clientId: cli.id, serviceId: svc.id,
      start: '2026-06-01T10:00:00.000Z', end: '2026-06-01T11:00:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-afternoon', clientId: cli.id, serviceId: svc.id,
      start: '2026-06-01T14:00:00.000Z', end: '2026-06-01T15:00:00.000Z', status: 'completed',
    });

    // Sub-range that only captures the morning appointment
    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-06-01T08:00:00.000Z'),
      new Date('2026-06-01T12:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(1);
    expect(stats.appointmentsBooked).toBe(1);
    expect(stats.appointmentsCompleted).toBe(0);
  });
});
