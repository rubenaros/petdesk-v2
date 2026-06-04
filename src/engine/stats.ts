import type { Repository } from '../domain/ports';
import type { Appointment, StatsBundle } from '../domain/types';

function parseIso(s: string): Date {
  return new Date(s);
}

function iso(d: Date): string {
  return d.toISOString();
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Calcula los minutos laborables (9:00–18:00 UTC) que caen dentro del rango.
 * Para cada día que intersecta con el rango, suma la intersección.
 */
function workableMinutesInRange(rangeStart: Date, rangeEnd: Date): number {
  if (rangeStart >= rangeEnd) return 0;

  let total = 0;
  const day = new Date(rangeStart);
  day.setUTCHours(0, 0, 0, 0);

  const endDay = new Date(rangeEnd);
  endDay.setUTCHours(0, 0, 0, 0);

  while (day <= endDay) {
    const workStart = new Date(day);
    workStart.setUTCHours(9, 0, 0, 0);
    const workEnd = new Date(day);
    workEnd.setUTCHours(18, 0, 0, 0);

    const intersectStart = workStart > rangeStart ? workStart : rangeStart;
    const intersectEnd = workEnd < rangeEnd ? workEnd : rangeEnd;

    if (intersectStart < intersectEnd) {
      total += (intersectEnd.getTime() - intersectStart.getTime()) / 60_000;
    }

    day.setUTCDate(day.getUTCDate() + 1);
  }

  return total;
}

export class StatsEngine {
  constructor(private repo: Repository) {}

  compute(rangeStart: Date, rangeEnd: Date): StatsBundle {
    const appts = this.repo.listAppointments();
    const inRange = appts.filter((a) => {
      const start = parseIso(a.start);
      return start >= rangeStart && start < rangeEnd;
    });

    const total = inRange.length;
    const booked = inRange.filter((a) => a.status === 'booked').length;
    const completed = inRange.filter((a) => a.status === 'completed').length;
    const cancelled = inRange.filter((a) => a.status === 'cancelled').length;

    const cancellationRate = total === 0 ? 0 : round4(cancelled / total);

    const occupiedMinutes = inRange
      .filter((a) => a.status === 'booked' || a.status === 'completed')
      .reduce((sum, a) => {
        const svc = this.repo.getService(a.serviceId);
        return sum + (svc ? svc.durationMin : 0);
      }, 0);

    const workableMinutes = workableMinutesInRange(rangeStart, rangeEnd);
    const occupancyRate = workableMinutes === 0 ? 0 : round4(occupiedMinutes / workableMinutes);

    const topServicesByBookings = this.buildTopServices(
      inRange.filter((a) => a.status === 'booked' || a.status === 'completed'),
    );

    const topServicesByCancellations = this.buildTopServices(
      inRange.filter((a) => a.status === 'cancelled'),
    );

    const topClientsByVisits = this.buildTopClients(
      inRange.filter((a) => a.status !== 'cancelled'),
    );

    return {
      rangeStart: iso(rangeStart),
      rangeEnd: iso(rangeEnd),
      appointmentsTotal: total,
      appointmentsBooked: booked,
      appointmentsCompleted: completed,
      appointmentsCancelled: cancelled,
      cancellationRate,
      occupancyRate,
      topServicesByBookings,
      topServicesByCancellations,
      topClientsByVisits,
    };
  }

  private buildTopServices(appts: Appointment[]) {
    const counts = new Map<string, number>();
    for (const a of appts) {
      counts.set(a.serviceId, (counts.get(a.serviceId) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([serviceId, count]) => ({ serviceId, count }))
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.serviceId.localeCompare(b.serviceId)))
      .slice(0, 5);
  }

  private buildTopClients(appts: Appointment[]) {
    const counts = new Map<string, number>();
    for (const a of appts) {
      counts.set(a.clientId, (counts.get(a.clientId) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([clientId, count]) => ({ clientId, count }))
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.clientId.localeCompare(b.clientId)))
      .slice(0, 5);
  }
}
