import type { Repository } from '../domain/ports';
import type { Appointment, StatsBundle } from '../domain/types';

function parseIso(s: string): Date {
  return new Date(s);
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function appointmentDurationMin(appt: Appointment): number {
  const start = parseIso(appt.start);
  const end = parseIso(appt.end);
  return (end.getTime() - start.getTime()) / 60_000;
}

function countWorkableMinutes(rangeStart: Date, rangeEnd: Date): number {
  let minutes = 0;
  const dayStart = new Date(rangeStart);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(rangeEnd);
  dayEnd.setUTCHours(0, 0, 0, 0);

  for (let d = new Date(dayStart); d <= dayEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    const workStart = new Date(d);
    workStart.setUTCHours(9, 0, 0, 0);
    const workEnd = new Date(d);
    workEnd.setUTCHours(18, 0, 0, 0);

    if (workStart >= rangeEnd || workEnd <= rangeStart) {
      continue;
    }

    minutes += 540; // 9 hours * 60 minutes
  }

  return minutes;
}

export class StatsEngine {
  constructor(private repo: Repository) {}

  compute(rangeStart: Date, rangeEnd: Date): StatsBundle {
    const all = this.repo.listAppointments();
    const inRange = all.filter((a) => {
      const start = parseIso(a.start);
      return start >= rangeStart && start < rangeEnd;
    });

    const total = inRange.length;
    const booked = inRange.filter((a) => a.status === 'booked').length;
    const completed = inRange.filter((a) => a.status === 'completed').length;
    const cancelled = inRange.filter((a) => a.status === 'cancelled').length;

    const cancellationRate = total === 0 ? 0 : round4(cancelled / total);

    const nonCancelledDuration = inRange
      .filter((a) => a.status === 'booked' || a.status === 'completed')
      .reduce((sum, a) => sum + appointmentDurationMin(a), 0);

    const workableMinutes = countWorkableMinutes(rangeStart, rangeEnd);
    const occupancyRate = workableMinutes === 0 ? 0 : round4(nonCancelledDuration / workableMinutes);

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
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
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

  private buildTopServices(appointments: Appointment[]) {
    const counts = new Map<string, number>();
    for (const a of appointments) {
      counts.set(a.serviceId, (counts.get(a.serviceId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([serviceId, count]) => ({ serviceId, count }))
      .sort((a, b) => (b.count - a.count) || a.serviceId.localeCompare(b.serviceId))
      .slice(0, 5);
  }

  private buildTopClients(appointments: Appointment[]) {
    const counts = new Map<string, number>();
    for (const a of appointments) {
      counts.set(a.clientId, (counts.get(a.clientId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([clientId, count]) => ({ clientId, count }))
      .sort((a, b) => (b.count - a.count) || a.clientId.localeCompare(b.clientId))
      .slice(0, 5);
  }
}
