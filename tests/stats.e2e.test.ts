import { describe, expect, it } from 'vitest';
import { StatsEngine } from '../src/engine/stats';
import { InMemoryRepo } from '../src/infra/memoryRepo';

describe('StatsEngine e2e', () => {
  it('escenario completo: 3 servicios, 4 clientes, 10 citas mixtas + 2 waitlist', () => {
    const repo = new InMemoryRepo(false);

    // 3 servicios
    repo.saveService({ id: 'svc-a', name: 'Servicio A', durationMin: 60, priceCents: 100, upsells: [] });
    repo.saveService({ id: 'svc-b', name: 'Servicio B', durationMin: 90, priceCents: 150, upsells: [] });
    repo.saveService({ id: 'svc-c', name: 'Servicio C', durationMin: 30, priceCents: 50, upsells: [] });

    // 4 clientes
    repo.saveClient({ id: 'cli-1', name: 'Cliente 1', phone: '111' });
    repo.saveClient({ id: 'cli-2', name: 'Cliente 2', phone: '222' });
    repo.saveClient({ id: 'cli-3', name: 'Cliente 3', phone: '333' });
    repo.saveClient({ id: 'cli-4', name: 'Cliente 4', phone: '444' });

    // Semana: 2026-01-05 (lunes) a 2026-01-12 (lunes siguiente)
    const weekStart = new Date('2026-01-05T00:00:00.000Z');
    const weekEnd = new Date('2026-01-12T00:00:00.000Z');

    // 10 citas en la semana:
    // 5 booked
    repo.saveAppointment({
      id: 'appt-1', clientId: 'cli-1', serviceId: 'svc-a',
      start: '2026-01-05T10:00:00.000Z', end: '2026-01-05T11:00:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-2', clientId: 'cli-2', serviceId: 'svc-a',
      start: '2026-01-06T10:00:00.000Z', end: '2026-01-06T11:00:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-3', clientId: 'cli-1', serviceId: 'svc-b',
      start: '2026-01-07T10:00:00.000Z', end: '2026-01-07T11:30:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-4', clientId: 'cli-3', serviceId: 'svc-c',
      start: '2026-01-08T10:00:00.000Z', end: '2026-01-08T10:30:00.000Z', status: 'booked',
    });
    repo.saveAppointment({
      id: 'appt-5', clientId: 'cli-4', serviceId: 'svc-a',
      start: '2026-01-09T10:00:00.000Z', end: '2026-01-09T11:00:00.000Z', status: 'booked',
    });

    // 3 completed
    repo.saveAppointment({
      id: 'appt-6', clientId: 'cli-1', serviceId: 'svc-a',
      start: '2026-01-05T14:00:00.000Z', end: '2026-01-05T15:00:00.000Z', status: 'completed',
    });
    repo.saveAppointment({
      id: 'appt-7', clientId: 'cli-2', serviceId: 'svc-b',
      start: '2026-01-06T14:00:00.000Z', end: '2026-01-06T15:30:00.000Z', status: 'completed',
    });
    repo.saveAppointment({
      id: 'appt-8', clientId: 'cli-3', serviceId: 'svc-a',
      start: '2026-01-07T14:00:00.000Z', end: '2026-01-07T15:00:00.000Z', status: 'completed',
    });

    // 2 cancelled
    repo.saveAppointment({
      id: 'appt-9', clientId: 'cli-4', serviceId: 'svc-b',
      start: '2026-01-08T14:00:00.000Z', end: '2026-01-08T15:30:00.000Z', status: 'cancelled',
    });
    repo.saveAppointment({
      id: 'appt-10', clientId: 'cli-2', serviceId: 'svc-c',
      start: '2026-01-09T14:00:00.000Z', end: '2026-01-09T14:30:00.000Z', status: 'cancelled',
    });

    // 2 waitlist entries (irrelevantes para stats)
    repo.saveWaitlistEntry({
      id: 'wl-1', clientId: 'cli-1', serviceId: 'svc-a',
      windowStart: '2026-01-05T08:00:00.000Z', windowEnd: '2026-01-05T18:00:00.000Z',
      createdAt: '2026-01-04T10:00:00.000Z',
    });
    repo.saveWaitlistEntry({
      id: 'wl-2', clientId: 'cli-2', serviceId: 'svc-b',
      windowStart: '2026-01-06T08:00:00.000Z', windowEnd: '2026-01-06T18:00:00.000Z',
      createdAt: '2026-01-04T11:00:00.000Z',
    });

    const engine = new StatsEngine(repo);
    const stats = engine.compute(weekStart, weekEnd);

    // Verificaciones de volumen
    expect(stats.appointmentsTotal).toBe(10);
    expect(stats.appointmentsBooked).toBe(5);
    expect(stats.appointmentsCompleted).toBe(3);
    expect(stats.appointmentsCancelled).toBe(2);

    // Tasas
    expect(stats.cancellationRate).toBe(0.2);

    // occupancyRate: non-cancelled duration / workable minutes
    // non-cancelled = 5 booked + 3 completed = 8 citas
    // durations: svc-a=60min (×5), svc-b=90min (×2), svc-c=30min (×1)
    // total = 60*5 + 90*2 + 30*1 = 300 + 180 + 30 = 510 min
    // workable minutes: 7 días × 9h × 60min = 7 × 540 = 3780 min
    expect(stats.occupancyRate).toBe(round4(510 / 3780));

    // topServicesByBookings (booked + completed, ordenado desc, máx 5)
    // svc-a: 5 (3 booked + 2 completed)
    // svc-b: 2 (1 booked + 1 completed)
    // svc-c: 1 (1 booked)
    expect(stats.topServicesByBookings).toEqual([
      { serviceId: 'svc-a', count: 5 },
      { serviceId: 'svc-b', count: 2 },
      { serviceId: 'svc-c', count: 1 },
    ]);

    // topServicesByCancellations
    // svc-b: 1, svc-c: 1
    expect(stats.topServicesByCancellations).toEqual([
      { serviceId: 'svc-b', count: 1 },
      { serviceId: 'svc-c', count: 1 },
    ]);

    // topClientsByVisits (no canceladas = booked + completed)
    // cli-1: 3 (appt-1 booked, appt-3 booked, appt-6 completed)
    // cli-2: 2 (appt-2 booked, appt-7 completed)
    // cli-3: 2 (appt-4 booked, appt-8 completed)
    // cli-4: 1 (appt-5 booked)
    expect(stats.topClientsByVisits).toEqual([
      { clientId: 'cli-1', count: 3 },
      { clientId: 'cli-2', count: 2 },
      { clientId: 'cli-3', count: 2 },
      { clientId: 'cli-4', count: 1 },
    ]);
  });
});

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
