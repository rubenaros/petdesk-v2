import { describe, expect, it } from 'vitest';
import { StatsEngine } from '../src/engine/stats';
import { InMemoryRepo } from '../src/infra/memoryRepo';

describe('StatsEngine e2e', () => {
  const weekStart = new Date('2026-06-01T00:00:00.000Z');
  const weekEnd = new Date('2026-06-08T00:00:00.000Z');

  function seedFullWeek(repo: InMemoryRepo) {
    // 3 services
    const svcBath = { id: 'svc-bath', name: 'Baño completo', durationMin: 60, priceCents: 2500, upsells: ['Corte de uñas'] };
    const svcGroom = { id: 'svc-groom', name: 'Corte y peinado', durationMin: 90, priceCents: 3500, upsells: [] };
    const svcSpa = { id: 'svc-spa', name: 'Spa de mascotas', durationMin: 120, priceCents: 5000, upsells: [] };
    repo.saveService(svcBath);
    repo.saveService(svcGroom);
    repo.saveService(svcSpa);

    // 4 clients
    const clientA = { id: 'cli-ana', name: 'Ana', phone: '+56911111111' };
    const clientB = { id: 'cli-bob', name: 'Bob', phone: '+56922222222' };
    const clientC = { id: 'cli-cam', name: 'Camila', phone: '+56933333333' };
    const clientD = { id: 'cli-dan', name: 'Daniel', phone: '+56944444444' };
    repo.saveClient(clientA);
    repo.saveClient(clientB);
    repo.saveClient(clientC);
    repo.saveClient(clientD);

    // 10 appointments in the week, mixed status
    // booked (5)
    repo.saveAppointment({ id: 'appt-01', clientId: clientA.id, serviceId: svcBath.id, start: '2026-06-01T09:00:00.000Z', end: '2026-06-01T10:00:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'appt-02', clientId: clientA.id, serviceId: svcGroom.id, start: '2026-06-01T10:00:00.000Z', end: '2026-06-01T11:30:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'appt-03', clientId: clientB.id, serviceId: svcBath.id, start: '2026-06-02T09:00:00.000Z', end: '2026-06-02T10:00:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'appt-04', clientId: clientC.id, serviceId: svcSpa.id, start: '2026-06-03T09:00:00.000Z', end: '2026-06-03T11:00:00.000Z', status: 'booked' });
    repo.saveAppointment({ id: 'appt-05', clientId: clientD.id, serviceId: svcBath.id, start: '2026-06-04T09:00:00.000Z', end: '2026-06-04T10:00:00.000Z', status: 'booked' });

    // completed (3)
    repo.saveAppointment({ id: 'appt-06', clientId: clientA.id, serviceId: svcBath.id, start: '2026-06-05T09:00:00.000Z', end: '2026-06-05T10:00:00.000Z', status: 'completed' });
    repo.saveAppointment({ id: 'appt-07', clientId: clientB.id, serviceId: svcGroom.id, start: '2026-06-05T10:00:00.000Z', end: '2026-06-05T11:30:00.000Z', status: 'completed' });
    repo.saveAppointment({ id: 'appt-08', clientId: clientC.id, serviceId: svcBath.id, start: '2026-06-06T09:00:00.000Z', end: '2026-06-06T10:00:00.000Z', status: 'completed' });

    // cancelled (2)
    repo.saveAppointment({ id: 'appt-09', clientId: clientD.id, serviceId: svcGroom.id, start: '2026-06-06T10:00:00.000Z', end: '2026-06-06T11:30:00.000Z', status: 'cancelled' });
    repo.saveAppointment({ id: 'appt-10', clientId: clientA.id, serviceId: svcSpa.id, start: '2026-06-07T09:00:00.000Z', end: '2026-06-07T11:00:00.000Z', status: 'cancelled' });

    // 2 waitlist entries (irrelevant for stats but must not affect them)
    repo.saveWaitlistEntry({
      id: 'wl-1', clientId: clientA.id, serviceId: svcBath.id,
      windowStart: '2026-06-01T00:00:00.000Z', windowEnd: '2026-06-07T23:59:59.000Z', createdAt: '2026-06-01T00:00:00.000Z',
    });
    repo.saveWaitlistEntry({
      id: 'wl-2', clientId: clientB.id, serviceId: svcGroom.id,
      windowStart: '2026-06-01T00:00:00.000Z', windowEnd: '2026-06-07T23:59:59.000Z', createdAt: '2026-06-01T01:00:00.000Z',
    });
  }

  it('computes correct totals and status distribution for a full week', () => {
    const repo = new InMemoryRepo(false);
    seedFullWeek(repo);

    const engine = new StatsEngine(repo);
    const stats = engine.compute(weekStart, weekEnd);

    expect(stats.appointmentsTotal).toBe(10);
    expect(stats.appointmentsBooked).toBe(5);
    expect(stats.appointmentsCompleted).toBe(3);
    expect(stats.appointmentsCancelled).toBe(2);
    expect(stats.cancellationRate).toBe(0.2);
  });

  it('topServicesByBookings is sorted by count desc, then id asc', () => {
    const repo = new InMemoryRepo(false);
    seedFullWeek(repo);

    const engine = new StatsEngine(repo);
    const stats = engine.compute(weekStart, weekEnd);

    // bath: booked 3 + completed 2 = 5
    // groom: booked 1 + completed 1 = 2
    // spa: booked 1 + completed 0 = 1
    expect(stats.topServicesByBookings).toEqual([
      { serviceId: 'svc-bath', count: 5 },
      { serviceId: 'svc-groom', count: 2 },
      { serviceId: 'svc-spa', count: 1 },
    ]);
  });

  it('topServicesByCancellations reflects cancelled appointments only', () => {
    const repo = new InMemoryRepo(false);
    seedFullWeek(repo);

    const engine = new StatsEngine(repo);
    const stats = engine.compute(weekStart, weekEnd);

    // groom: 1 cancelled, spa: 1 cancelled
    expect(stats.topServicesByCancellations).toEqual([
      { serviceId: 'svc-groom', count: 1 },
      { serviceId: 'svc-spa', count: 1 },
    ]);
  });

  it('topClientsByVisits counts only non-cancelled visits and is sorted correctly', () => {
    const repo = new InMemoryRepo(false);
    seedFullWeek(repo);

    const engine = new StatsEngine(repo);
    const stats = engine.compute(weekStart, weekEnd);

    // booked + completed (non-cancelled):
    // Ana: 3 (2 booked + 1 completed) — waitlist does NOT contribute
    // Bob: 2 (1 booked + 1 completed)
    // Camila: 2 (1 booked + 1 completed)
    // Daniel: 1 (1 booked)
    expect(stats.topClientsByVisits).toEqual([
      { clientId: 'cli-ana', count: 3 },
      { clientId: 'cli-bob', count: 2 },
      { clientId: 'cli-cam', count: 2 },
      { clientId: 'cli-dan', count: 1 },
    ]);
  });

  it('occupancyRate reflects non-cancelled appointment minutes over workable minutes', () => {
    const repo = new InMemoryRepo(false);
    seedFullWeek(repo);

    const engine = new StatsEngine(repo);
    const stats = engine.compute(weekStart, weekEnd);

    // Non-cancelled minutes: bath (5) * 60 = 300, groom (2) * 90 = 180, spa (1) * 120 = 120
    // Total = 600 min
    // Engine applies round4 -> 600 / 3780 = 0.1587
    expect(stats.occupancyRate).toBe(0.1587);
  });
});
