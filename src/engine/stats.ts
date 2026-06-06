import type { Repository } from '../domain/ports';
import type { StatsBundle, ServiceCount, ClientCount } from '../domain/types';

export class StatsEngine {
  constructor(private repo: Repository) {}

  compute(rangeStart: Date, rangeEnd: Date): StatsBundle {
    const allAppointments = this.repo.listAppointments();

    // Citas cuyo start cae en [rangeStart, rangeEnd)
    const inRange = allAppointments.filter((a) => {
      const s = new Date(a.start);
      return s >= rangeStart && s < rangeEnd;
    });

    const total = inRange.length;
    const bookedCount = inRange.filter((a) => a.status === 'booked').length;
    const completedCount = inRange.filter((a) => a.status === 'completed').length;
    const cancelledCount = inRange.filter((a) => a.status === 'cancelled').length;

    const cancellationRate =
      total === 0 ? 0 : Math.round((cancelledCount / total) * 10000) / 10000;

    // occupancyRate: durationMin de citas booked+completed / minutos laborables del rango
    const nonCancelledAppointments = inRange.filter(
      (a) => a.status === 'booked' || a.status === 'completed',
    );

    let occupiedMinutes = 0;
    for (const a of nonCancelledAppointments) {
      const svc = this.repo.getService(a.serviceId);
      if (svc) {
        occupiedMinutes += svc.durationMin;
      }
    }

    const workableMinutes = this.calcWorkableMinutes(rangeStart, rangeEnd);
    const occupancyRate =
      workableMinutes === 0
        ? 0
        : Math.round((occupiedMinutes / workableMinutes) * 10000) / 10000;

    // topServicesByBookings: solo booked+completed, top 5 por count desc
    const bookingsByService = this.countByField(
      nonCancelledAppointments,
      'serviceId',
    );
    const topServicesByBookings = this.makeTopServiceCounts(bookingsByService, 5);

    // topServicesByCancellations: solo cancelled, top 5 por count desc
    const cancelledAppointments = inRange.filter((a) => a.status === 'cancelled');
    const cancellationsByService = this.countByField(
      cancelledAppointments,
      'serviceId',
    );
    const topServicesByCancellations = this.makeTopServiceCounts(
      cancellationsByService,
      5,
    );

    // topClientsByVisits: clientes por citas no canceladas, top 5 por count desc
    const visitsByClient = this.countByField(
      nonCancelledAppointments,
      'clientId',
    );
    const topClientsByVisits = this.makeTopClientCounts(visitsByClient, 5);

    return {
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      appointmentsTotal: total,
      appointmentsBooked: bookedCount,
      appointmentsCompleted: completedCount,
      appointmentsCancelled: cancelledCount,
      cancellationRate,
      occupancyRate,
      topServicesByBookings,
      topServicesByCancellations,
      topClientsByVisits,
    };
  }

  private calcWorkableMinutes(start: Date, end: Date): number {
    let minutes = 0;
    const dayCursor = new Date(start);
    dayCursor.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setUTCHours(0, 0, 0, 0);

    for (
      let d = new Date(dayCursor);
      d <= endDay;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const open = new Date(d);
      open.setUTCHours(9, 0, 0, 0);
      const close = new Date(d);
      close.setUTCHours(18, 0, 0, 0);

      const effectiveOpen = open < start ? start : open;
      const effectiveClose = close > end ? end : close;

      if (effectiveClose > effectiveOpen) {
        minutes += (effectiveClose.getTime() - effectiveOpen.getTime()) / 60000;
      }
    }

    return minutes;
  }

  private countByField(
    appointments: { serviceId: string; clientId: string }[],
    field: 'serviceId' | 'clientId',
  ): Map<string, number> {
    const counts = new Map<string, number>();
    for (const a of appointments) {
      const key = field === 'serviceId' ? a.serviceId : a.clientId;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }

  private makeTopServiceCounts(
    counts: Map<string, number>,
    n: number,
  ): ServiceCount[] {
    const entries = Array.from(counts.entries());
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, n).map(([serviceId, count]) => ({ serviceId, count }));
  }

  private makeTopClientCounts(
    counts: Map<string, number>,
    n: number,
  ): ClientCount[] {
    const entries = Array.from(counts.entries());
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, n).map(([clientId, count]) => ({ clientId, count }));
  }
}
