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
  it('compute devuelve métricas correctas para citas en el rango', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-ana', name: 'Ana', phone: '111' };
    repo.saveClient(cli);

    const start = new Date('2099-01-01T10:00:00.000Z');
    const end = new Date('2099-01-01T11:00:00.000Z');
    repo.saveAppointment({
      id: 'appt-1', clientId: cli.id, serviceId: svc.id,
      start: start.toISOString(), end: end.toISOString(), status: 'booked',
    });

    const rangeStart = new Date('2099-01-01T00:00:00.000Z');
    const rangeEnd = new Date('2099-01-02T00:00:00.000Z');
    const stats = engine.compute(rangeStart, rangeEnd);

    expect(stats.appointmentsTotal).toBe(1);
    expect(stats.appointmentsBooked).toBe(1);
    expect(stats.appointmentsCompleted).toBe(0);
    expect(stats.appointmentsCancelled).toBe(0);
    expect(stats.cancellationRate).toBe(0);
    expect(stats.occupancyRate).toBeGreaterThan(0);
    expect(stats.topServicesByBookings).toHaveLength(1);
    expect(stats.topServicesByBookings[0].serviceId).toBe(svc.id);
    expect(stats.topServicesByBookings[0].count).toBe(1);
    expect(stats.topClientsByVisits).toHaveLength(1);
    expect(stats.topClientsByVisits[0].clientId).toBe(cli.id);
  });

  it('compute filtra citas fuera del rango', () => {
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
    expect(stats.topServicesByBookings).toHaveLength(0);
  });

  it('compute calcula cancellationRate correctamente', () => {
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
    repo.saveAppointment({
      id: 'appt-2', clientId: cli.id, serviceId: svc.id,
      start: '2099-01-01T12:00:00.000Z', end: '2099-01-01T13:00:00.000Z', status: 'cancelled',
    });

    const stats = engine.compute(
      new Date('2099-01-01T00:00:00.000Z'),
      new Date('2099-01-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(2);
    expect(stats.cancellationRate).toBe(0.5);
    expect(stats.appointmentsBooked).toBe(1);
    expect(stats.appointmentsCancelled).toBe(1);
  });

  it('compute genera tops con tie-break estable por id', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const svcA = { id: 'svc-a', name: 'A', durationMin: 30, priceCents: 100, upsells: [] };
    const svcB = { id: 'svc-b', name: 'B', durationMin: 30, priceCents: 100, upsells: [] };
    repo.saveService(svcA);
    repo.saveService(svcB);
    const cli = { id: 'cli-ana', name: 'Ana', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({
      id: 'appt-1', clientId: cli.id, serviceId: svcA.id,
      start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T10:30:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-2', clientId: cli.id, serviceId: svcB.id,
      start: '2099-01-01T11:00:00.000Z', end: '2099-01-01T11:30:00.000Z', status: 'booked',
    });

    const stats = engine.compute(
      new Date('2099-01-01T00:00:00.000Z'),
      new Date('2099-01-02T00:00:00.000Z'),
    );

    expect(stats.topServicesByBookings).toHaveLength(2);
    // Mismo count (1 cada uno) -> tie-break por serviceId ascendente
    expect(stats.topServicesByBookings[0].serviceId).toBe('svc-a');
    expect(stats.topServicesByBookings[1].serviceId).toBe('svc-b');
  });
});
