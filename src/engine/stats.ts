import type { Repository } from '../domain/ports';
import type { StatsBundle, ServiceCount, ClientCount } from '../domain/types';

export class StatsEngine {
  constructor(private repo: Repository) {}

  compute(rangeStart: Date, rangeEnd: Date): StatsBundle {
    const appointments = this.repo.listAppointments().filter((a) => {
      const start = new Date(a.start);
      return start >= rangeStart && start < rangeEnd;
    });

    const total = appointments.length;
    const booked = appointments.filter((a) => a.status === 'booked').length;
    const completed = appointments.filter((a) => a.status === 'completed').length;
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length;

    const cancellationRate = total === 0 ? 0 : Math.round((cancelled / total) * 10000) / 10000;

    let nonCancelledDuration = 0;
    const serviceBookings = new Map<string, number>();
    const serviceCancellations = new Map<string, number>();
    const clientVisits = new Map<string, number>();

    for (const a of appointments) {
      if (a.status !== 'cancelled') {
        const svc = this.repo.getService(a.serviceId);
        nonCancelledDuration += svc?.durationMin ?? 0;

        serviceBookings.set(a.serviceId, (serviceBookings.get(a.serviceId) ?? 0) + 1);
        clientVisits.set(a.clientId, (clientVisits.get(a.clientId) ?? 0) + 1);
      } else {
        serviceCancellations.set(a.serviceId, (serviceCancellations.get(a.serviceId) ?? 0) + 1);
      }
    }

    const workableMinutes = this.calculateWorkableMinutes(rangeStart, rangeEnd);
    const occupancyRate = workableMinutes === 0 ? 0 : Math.round((nonCancelledDuration / workableMinutes) * 10000) / 10000;

    const topServicesByBookings = this.buildServiceTop5(serviceBookings);
    const topServicesByCancellations = this.buildServiceTop5(serviceCancellations);
    const topClientsByVisits = this.buildClientTop5(clientVisits);

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

  private calculateWorkableMinutes(rangeStart: Date, rangeEnd: Date): number {
    let minutes = 0;
    const day = new Date(rangeStart);
    day.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(rangeEnd);
    endDay.setUTCHours(0, 0, 0, 0);
    if (rangeEnd > endDay) {
      endDay.setUTCDate(endDay.getUTCDate() + 1);
    }

    for (let d = new Date(day); d < endDay; d.setUTCDate(d.getUTCDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setUTCHours(9, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setUTCHours(18, 0, 0, 0);

      const intersectStart = dayStart < rangeStart ? rangeStart : dayStart;
      const intersectEnd = dayEnd < rangeEnd ? dayEnd : rangeEnd;

      if (intersectStart < intersectEnd) {
        minutes += (intersectEnd.getTime() - intersectStart.getTime()) / 60_000;
      }
    }

    return minutes;
  }

  private buildServiceTop5(counts: Map<string, number>): ServiceCount[] {
    return [...counts.entries()]
      .map(([serviceId, count]) => ({ serviceId, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.serviceId.localeCompare(b.serviceId);
      })
      .slice(0, 5);
  }

  private buildClientTop5(counts: Map<string, number>): ClientCount[] {
    return [...counts.entries()]
      .map(([clientId, count]) => ({ clientId, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.clientId.localeCompare(b.clientId);
      })
      .slice(0, 5);
  }
}
