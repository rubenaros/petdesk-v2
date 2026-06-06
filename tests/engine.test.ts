import { describe, expect, it } from 'vitest';
import { Scheduler } from '../src/engine/scheduler';
import { StatsEngine } from '../src/engine/stats';
import { InMemoryRepo } from '../src/infra/memoryRepo';
import { SystemClock } from '../src/infra/systemClock';
import { schedulerPortContract } from './contracts/SchedulerPort.contract';

describe('Scheduler', () => {
  schedulerPortContract(() => {
    const repo = new InMemoryRepo();
    return { scheduler: new Scheduler(repo, new SystemClock()), repo, clock: new SystemClock() };
  });
});

describe('StatsEngine', () => {
  it('compute devuelve StatsBundle con métricas correctas', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svcA = { id: 'svc-a', name: 'A', durationMin: 60, priceCents: 100, upsells: [] };
    const svcB = { id: 'svc-b', name: 'B', durationMin: 30, priceCents: 50, upsells: [] };
    repo.saveService(svcA);
    repo.saveService(svcB);

    const cliX = { id: 'cli-x', name: 'X', phone: '111' };
    const cliY = { id: 'cli-y', name: 'Y', phone: '222' };
    repo.saveClient(cliX);
    repo.saveClient(cliY);

    const start = '2099-01-01T10:00:00.000Z';
    const end = '2099-01-01T11:00:00.000Z';

    repo.saveAppointment({
      id: 'appt-1', clientId: cliX.id, serviceId: svcA.id,
      start, end, status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-2', clientId: cliY.id, serviceId: svcB.id,
      start: '2099-01-01T12:00:00.000Z', end: '2099-01-01T12:30:00.000Z', status: 'completed',
    });
    repo.saveAppointment({
      id: 'appt-3', clientId: cliX.id, serviceId: svcA.id,
      start: '2099-01-01T14:00:00.000Z', end: '2099-01-01T15:00:00.000Z', status: 'cancelled',
    });

    const stats = engine.compute('2099-01-01T00:00:00.000Z', '2099-01-02T00:00:00.000Z');

    expect(stats.appointmentsTotal).toBe(3);
    expect(stats.appointmentsBooked).toBe(1);
    expect(stats.appointmentsCompleted).toBe(1);
    expect(stats.appointmentsCancelled).toBe(1);
    expect(stats.cancellationRate).toBe(0.3333);
    expect(stats.occupancyRate).toBe(Number((90 / 540).toFixed(4)));
    expect(stats.topServicesByBookings).toEqual([
      { serviceId: 'svc-a', count: 1 },
      { serviceId: 'svc-b', count: 1 },
    ]);
    expect(stats.topServicesByCancellations).toEqual([
      { serviceId: 'svc-a', count: 1 },
      { serviceId: 'svc-b', count: 0 },
    ]);
    expect(stats.topClientsByVisits).toEqual([
      { clientId: 'cli-x', count: 1 },
      { clientId: 'cli-y', count: 1 },
    ]);
  });

  it('compute filtra citas fuera del rango', () => {
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

    const stats = engine.compute('2099-02-01T00:00:00.000Z', '2099-02-02T00:00:00.000Z');
    expect(stats.appointmentsTotal).toBe(0);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.cancellationRate).toBe(0);
  });
});
