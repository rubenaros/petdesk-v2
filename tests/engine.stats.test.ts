import { describe, expect, it } from 'vitest';
import { StatsEngine } from '../src/engine/stats';
import { InMemoryRepo } from '../src/infra/memoryRepo';

describe('StatsEngine', () => {
  it('rango vacío devuelve todos los valores en cero', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const rangeStart = new Date('2026-01-01T00:00:00.000Z');
    const rangeEnd = new Date('2026-01-02T00:00:00.000Z');
    const stats = engine.compute(rangeStart, rangeEnd);

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

  it('rango con solo cancelaciones: cancellationRate = 1, occupancy = 0', () => {
    const repo = new InMemoryRepo(false);
    repo.saveService({ id: 'svc-a', name: 'A', durationMin: 60, priceCents: 100, upsells: [] });
    repo.saveClient({ id: 'cli-1', name: 'One', phone: '111' });
    repo.saveAppointment({
      id: 'appt-1',
      clientId: 'cli-1',
      serviceId: 'svc-a',
      start: '2026-01-01T10:00:00.000Z',
      end: '2026-01-01T11:00:00.000Z',
      status: 'cancelled',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(1);
    expect(stats.appointmentsCancelled).toBe(1);
    expect(stats.cancellationRate).toBe(1);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.topServicesByCancellations).toEqual([{ serviceId: 'svc-a', count: 1 }]);
    expect(stats.topServicesByBookings).toEqual([]);
    expect(stats.topClientsByVisits).toEqual([]);
  });

  it('occupancy 100% cuando todas las citas no canceladas cubren el día laborable', () => {
    const repo = new InMemoryRepo(false);
    repo.saveService({ id: 'svc-a', name: 'A', durationMin: 540, priceCents: 100, upsells: [] });
    repo.saveClient({ id: 'cli-1', name: 'One', phone: '111' });
    repo.saveAppointment({
      id: 'appt-1',
      clientId: 'cli-1',
      serviceId: 'svc-a',
      start: '2026-01-01T09:00:00.000Z',
      end: '2026-01-01T18:00:00.000Z',
      status: 'booked',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(stats.occupancyRate).toBe(1);
    expect(stats.appointmentsTotal).toBe(1);
    expect(stats.appointmentsBooked).toBe(1);
  });

  it('mix de estados: totales, tasas y tops correctos', () => {
    const repo = new InMemoryRepo(false);
    repo.saveService({ id: 'svc-a', name: 'A', durationMin: 60, priceCents: 100, upsells: [] });
    repo.saveService({ id: 'svc-b', name: 'B', durationMin: 30, priceCents: 50, upsells: [] });
    repo.saveClient({ id: 'cli-1', name: 'One', phone: '111' });
    repo.saveClient({ id: 'cli-2', name: 'Two', phone: '222' });

    // cli-1: 2 booked svc-a, 1 completed svc-b
    repo.saveAppointment({
      id: 'appt-1', clientId: 'cli-1', serviceId: 'svc-a',
      start: '2026-01-01T10:00:00.000Z', end: '2026-01-01T11:00:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-2', clientId: 'cli-1', serviceId: 'svc-a',
      start: '2026-01-01T11:00:00.000Z', end: '2026-01-01T12:00:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-3', clientId: 'cli-1', serviceId: 'svc-b',
      start: '2026-01-01T12:00:00.000Z', end: '2026-01-01T12:30:00.000Z', status: 'completed',
    });

    // cli-2: 1 cancelled svc-a
    repo.saveAppointment({
      id: 'appt-4', clientId: 'cli-2', serviceId: 'svc-a',
      start: '2026-01-01T13:00:00.000Z', end: '2026-01-01T14:00:00.000Z', status: 'cancelled',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(4);
    expect(stats.appointmentsBooked).toBe(2);
    expect(stats.appointmentsCompleted).toBe(1);
    expect(stats.appointmentsCancelled).toBe(1);
    expect(stats.cancellationRate).toBe(0.25);
    // non-cancelled duration = 60 + 60 + 30 = 150 min; workable = 540 min
    expect(stats.occupancyRate).toBe(round4(150 / 540));

    expect(stats.topServicesByBookings).toEqual([
      { serviceId: 'svc-a', count: 2 },
      { serviceId: 'svc-b', count: 1 },
    ]);
    expect(stats.topServicesByCancellations).toEqual([
      { serviceId: 'svc-a', count: 1 },
    ]);
    expect(stats.topClientsByVisits).toEqual([
      { clientId: 'cli-1', count: 3 },
    ]);
  });

  it('ties en tops se resuelven por id ascendente', () => {
    const repo = new InMemoryRepo(false);
    repo.saveService({ id: 'svc-a', name: 'A', durationMin: 60, priceCents: 100, upsells: [] });
    repo.saveService({ id: 'svc-b', name: 'B', durationMin: 60, priceCents: 100, upsells: [] });
    repo.saveClient({ id: 'cli-1', name: 'One', phone: '111' });
    repo.saveClient({ id: 'cli-2', name: 'Two', phone: '222' });

    // 1 booked each -> tie
    repo.saveAppointment({
      id: 'appt-1', clientId: 'cli-1', serviceId: 'svc-a',
      start: '2026-01-01T10:00:00.000Z', end: '2026-01-01T11:00:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-2', clientId: 'cli-2', serviceId: 'svc-b',
      start: '2026-01-01T11:00:00.000Z', end: '2026-01-01T12:00:00.000Z', status: 'booked',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(stats.topServicesByBookings).toEqual([
      { serviceId: 'svc-a', count: 1 },
      { serviceId: 'svc-b', count: 1 },
    ]);
    expect(stats.topClientsByVisits).toEqual([
      { clientId: 'cli-1', count: 1 },
      { clientId: 'cli-2', count: 1 },
    ]);
  });

  it('citas fuera del rango no se cuentan', () => {
    const repo = new InMemoryRepo(false);
    repo.saveService({ id: 'svc-a', name: 'A', durationMin: 60, priceCents: 100, upsells: [] });
    repo.saveClient({ id: 'cli-1', name: 'One', phone: '111' });

    repo.saveAppointment({
      id: 'appt-1', clientId: 'cli-1', serviceId: 'svc-a',
      start: '2026-01-01T10:00:00.000Z', end: '2026-01-01T11:00:00.000Z', status: 'booked',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(0);
    expect(stats.occupancyRate).toBe(0);
  });

  it('top 5 limita resultados cuando hay más servicios', () => {
    const repo = new InMemoryRepo(false);
    const services = ['svc-a', 'svc-b', 'svc-c', 'svc-d', 'svc-e', 'svc-f'];
    for (const id of services) {
      repo.saveService({ id, name: id, durationMin: 60, priceCents: 100, upsells: [] });
    }
    repo.saveClient({ id: 'cli-1', name: 'One', phone: '111' });

    for (let i = 0; i < services.length; i++) {
      repo.saveAppointment({
        id: `appt-${i}`, clientId: 'cli-1', serviceId: services[i],
        start: `2026-01-01T${10 + i}:00:00.000Z`,
        end: `2026-01-01T${11 + i}:00:00.000Z`,
        status: 'booked',
      });
    }

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(stats.topServicesByBookings).toHaveLength(5);
  });
});

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
