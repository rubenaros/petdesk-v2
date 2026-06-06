import { describe, expect, it } from 'vitest';
import { StatsEngine } from '../src/engine/stats';
import { InMemoryRepo } from '../src/infra/memoryRepo';

describe('StatsEngine edge cases', () => {
  it('rango sin citas → todos los counts = 0, rates = 0, tops = []', () => {
    const repo = new InMemoryRepo(false);
    const engine = new StatsEngine(repo);

    const rangeStart = new Date('2026-03-01T00:00:00.000Z');
    const rangeEnd = new Date('2026-03-02T00:00:00.000Z');
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

  it('rango con TODAS canceladas → cancellationRate = 1, occupancy = 0', () => {
    const repo = new InMemoryRepo(false);
    repo.saveService({ id: 'svc-x', name: 'X', durationMin: 60, priceCents: 100, upsells: [] });
    repo.saveClient({ id: 'cli-x', name: 'X', phone: '999' });

    repo.saveAppointment({
      id: 'appt-c1', clientId: 'cli-x', serviceId: 'svc-x',
      start: '2026-04-01T10:00:00.000Z', end: '2026-04-01T11:00:00.000Z', status: 'cancelled',
    });
    repo.saveAppointment({
      id: 'appt-c2', clientId: 'cli-x', serviceId: 'svc-x',
      start: '2026-04-01T12:00:00.000Z', end: '2026-04-01T13:00:00.000Z', status: 'cancelled',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(2);
    expect(stats.appointmentsCancelled).toBe(2);
    expect(stats.cancellationRate).toBe(1);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.topServicesByBookings).toEqual([]);
    expect(stats.topClientsByVisits).toEqual([]);
    expect(stats.topServicesByCancellations).toEqual([{ serviceId: 'svc-x', count: 2 }]);
  });

  it('cita que arranca antes del rango pero termina dentro → NO se incluye (filtrado por start)', () => {
    // SUPUESTO: StatsEngine filtra citas por su fecha de inicio (start).
    // Una cita cuyo start < rangeStart no se cuenta, aunque su end caiga dentro del rango.
    const repo = new InMemoryRepo(false);
    repo.saveService({ id: 'svc-y', name: 'Y', durationMin: 120, priceCents: 100, upsells: [] });
    repo.saveClient({ id: 'cli-y', name: 'Y', phone: '888' });

    // Cita empieza a las 23:00 del día anterior y termina a la 01:00 del día del rango
    repo.saveAppointment({
      id: 'appt-span', clientId: 'cli-y', serviceId: 'svc-y',
      start: '2026-05-01T23:00:00.000Z', end: '2026-05-02T01:00:00.000Z', status: 'booked',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-05-02T00:00:00.000Z'),
      new Date('2026-05-03T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(0);
    expect(stats.occupancyRate).toBe(0);
  });

  it('empate en tops con 3+ elementos → sort estable por id alfabético', () => {
    const repo = new InMemoryRepo(false);
    const services = ['svc-alfa', 'svc-beta', 'svc-gamma'];
    for (const id of services) {
      repo.saveService({ id, name: id, durationMin: 60, priceCents: 100, upsells: [] });
    }

    const clients = ['cli-alfa', 'cli-beta', 'cli-gamma'];
    for (const id of clients) {
      repo.saveClient({ id, name: id, phone: '000' });
    }

    // Cada servicio tiene exactamente 1 booked (empate a 3 vías)
    // Cada cliente tiene exactamente 1 visita (empate a 3 vías)
    for (let i = 0; i < services.length; i++) {
      repo.saveAppointment({
        id: `appt-${i}`, clientId: clients[i], serviceId: services[i],
        start: `2026-06-01T${10 + i}:00:00.000Z`,
        end: `2026-06-01T${11 + i}:00:00.000Z`,
        status: 'booked',
      });
    }

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-02T00:00:00.000Z'),
    );

    // Todos con count=1; orden alfabético por id
    expect(stats.topServicesByBookings).toEqual([
      { serviceId: 'svc-alfa', count: 1 },
      { serviceId: 'svc-beta', count: 1 },
      { serviceId: 'svc-gamma', count: 1 },
    ]);
    expect(stats.topClientsByVisits).toEqual([
      { clientId: 'cli-alfa', count: 1 },
      { clientId: 'cli-beta', count: 1 },
      { clientId: 'cli-gamma', count: 1 },
    ]);
  });

  it('rango de múltiples días con citas solo en el medio → stats correctos para el sub-rango', () => {
    const repo = new InMemoryRepo(false);
    repo.saveService({ id: 'svc-z', name: 'Z', durationMin: 60, priceCents: 100, upsells: [] });
    repo.saveClient({ id: 'cli-z', name: 'Z', phone: '777' });

    // Cita en el día 2 de un rango de 3 días
    repo.saveAppointment({
      id: 'appt-mid', clientId: 'cli-z', serviceId: 'svc-z',
      start: '2026-07-02T10:00:00.000Z', end: '2026-07-02T11:00:00.000Z', status: 'completed',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-04T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(1);
    expect(stats.appointmentsCompleted).toBe(1);
    // workable minutes = 3 días × 540 = 1620
    expect(stats.occupancyRate).toBe(round4(60 / 1620));
  });
});

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
