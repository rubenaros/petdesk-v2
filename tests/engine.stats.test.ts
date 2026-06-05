import { describe, expect, it } from 'vitest';
import { StatsEngine } from '../src/engine/stats';
import { InMemoryRepo } from '../src/infra/memoryRepo';

describe('StatsEngine', () => {
  it('rango vacío devuelve todos los contadores en cero', () => {
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
    expect(stats.topServicesByBookings).toHaveLength(0);
    expect(stats.topServicesByCancellations).toHaveLength(0);
    expect(stats.topClientsByVisits).toHaveLength(0);
  });

  it('rango con solo cancelaciones: cancellationRate=1, occupancy=0', () => {
    const repo = new InMemoryRepo(false);
    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({
      id: 'appt-1',
      clientId: cli.id,
      serviceId: svc.id,
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
    expect(stats.topServicesByCancellations).toEqual([{ serviceId: svc.id, count: 1 }]);
    expect(stats.topServicesByBookings).toHaveLength(0);
    expect(stats.topClientsByVisits).toHaveLength(0);
  });

  it('occupancy 100% cuando todas las horas laborables están ocupadas', () => {
    const repo = new InMemoryRepo(false);
    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    // 9 citas de 60 min = 540 min = 9h, cubriendo exactamente 9:00–18:00
    for (let h = 9; h < 18; h++) {
      repo.saveAppointment({
        id: `appt-${h}`,
        clientId: cli.id,
        serviceId: svc.id,
        start: `2026-01-01T${String(h).padStart(2, '0')}:00:00.000Z`,
        end: `2026-01-01T${String(h + 1).padStart(2, '0')}:00:00.000Z`,
        status: 'booked',
      });
    }

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(9);
    expect(stats.appointmentsBooked).toBe(9);
    expect(stats.occupancyRate).toBe(1);
  });

  it('suma de estados por separado es igual al total', () => {
    const repo = new InMemoryRepo(false);
    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    repo.saveAppointment({ id: 'a1', clientId: cli.id, serviceId: svc.id, start: '2026-01-01T09:00:00.000Z', end: '2026-01-01T10:00:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'a2', clientId: cli.id, serviceId: svc.id, start: '2026-01-01T10:00:00.000Z', end: '2026-01-01T11:00:00.000Z', status: 'completed' });
    repo.saveAppointment({ id: 'a3', clientId: cli.id, serviceId: svc.id, start: '2026-01-01T11:00:00.000Z', end: '2026-01-01T12:00:00.000Z', status: 'cancelled' });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsBooked + stats.appointmentsCompleted + stats.appointmentsCancelled).toBe(stats.appointmentsTotal);
    expect(stats.cancellationRate).toBe(round4(1 / 3));
  });

  it('tops con empates se ordenan determinísticamente por id', () => {
    const repo = new InMemoryRepo(false);
    const svcA = { id: 'svc-a', name: 'A', durationMin: 30, priceCents: 100, upsells: [] };
    const svcB = { id: 'svc-b', name: 'B', durationMin: 30, priceCents: 100, upsells: [] };
    repo.saveService(svcA);
    repo.saveService(svcB);

    const cliX = { id: 'cli-x', name: 'X', phone: '111' };
    const cliY = { id: 'cli-y', name: 'Y', phone: '222' };
    repo.saveClient(cliX);
    repo.saveClient(cliY);

    // 2 booked para cada servicio → empate
    repo.saveAppointment({ id: 'a1', clientId: cliX.id, serviceId: svcA.id, start: '2026-01-01T09:00:00.000Z', end: '2026-01-01T09:30:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'a2', clientId: cliX.id, serviceId: svcA.id, start: '2026-01-01T10:00:00.000Z', end: '2026-01-01T10:30:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'a3', clientId: cliY.id, serviceId: svcB.id, start: '2026-01-01T11:00:00.000Z', end: '2026-01-01T11:30:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'a4', clientId: cliY.id, serviceId: svcB.id, start: '2026-01-01T12:00:00.000Z', end: '2026-01-01T12:30:00.000Z', status: 'booked' });

    // 2 visits para cada cliente → empate
    repo.saveAppointment({ id: 'a5', clientId: cliX.id, serviceId: svcA.id, start: '2026-01-01T13:00:00.000Z', end: '2026-01-01T13:30:00.000Z', status: 'completed' });
    repo.saveAppointment({ id: 'a6', clientId: cliY.id, serviceId: svcB.id, start: '2026-01-01T14:00:00.000Z', end: '2026-01-01T14:30:00.000Z', status: 'completed' });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    // Empate en servicios: ordenados por id asc
    expect(stats.topServicesByBookings).toEqual([
      { serviceId: 'svc-a', count: 3 },
      { serviceId: 'svc-b', count: 3 },
    ]);

    // Empate en clientes: ordenados por id asc
    expect(stats.topClientsByVisits).toEqual([
      { clientId: 'cli-x', count: 3 },
      { clientId: 'cli-y', count: 3 },
    ]);
  });

  it('solo cuenta citas cuyo start cae dentro del rango [inclusive, exclusive)', () => {
    const repo = new InMemoryRepo(false);
    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    // start justo en el límite inferior → incluida
    repo.saveAppointment({ id: 'a-in', clientId: cli.id, serviceId: svc.id, start: '2026-01-01T00:00:00.000Z', end: '2026-01-01T01:00:00.000Z', status: 'booked' });
    // start justo en el límite superior → excluida
    repo.saveAppointment({ id: 'a-out', clientId: cli.id, serviceId: svc.id, start: '2026-01-02T00:00:00.000Z', end: '2026-01-02T01:00:00.000Z', status: 'booked' });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(stats.appointmentsTotal).toBe(1);
    expect(stats.appointmentsBooked).toBe(1);
  });

  it('top 5 limita resultados y ordena descendentemente', () => {
    const repo = new InMemoryRepo(false);
    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 30, priceCents: 100, upsells: [] };
    repo.saveService(svc);
    const cli = { id: 'cli-a', name: 'A', phone: '111' };
    repo.saveClient(cli);

    // 6 citas cancelled
    for (let i = 0; i < 6; i++) {
      repo.saveAppointment({
        id: `a-${i}`,
        clientId: cli.id,
        serviceId: svc.id,
        start: `2026-01-01T${String(9 + i).padStart(2, '0')}:00:00.000Z`,
        end: `2026-01-01T${String(10 + i).padStart(2, '0')}:00:00.000Z`,
        status: 'cancelled',
      });
    }

    const engine = new StatsEngine(repo);
    const stats = engine.compute(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(stats.topServicesByCancellations).toHaveLength(1);
    expect(stats.topServicesByCancellations[0]).toEqual({ serviceId: svc.id, count: 6 });
  });
});

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
