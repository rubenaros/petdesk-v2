import type { Repository } from '../domain/ports';
import type {
  ClientCount,
  ServiceCount,
  StatsBundle,
} from '../domain/types';

function round4(n: number): number {
  return Number(n.toFixed(4));
}

function countWorkMinutes(rangeStart: string, rangeEnd: string): number {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  let minutes = 0;
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    minutes += 540; // 9:00–18:00 UTC = 9h = 540min
  }
  return minutes;
}

function topN<T>(
  items: T[],
  key: (x: T) => number,
  idKey: (x: T) => string,
  n: number,
): T[] {
  return items
    .slice()
    .sort((a, b) => key(b) - key(a) || idKey(a).localeCompare(idKey(b)))
    .slice(0, n);
}

export class StatsEngine {
  constructor(private repo: Repository) {}

  compute(rangeStart: string, rangeEnd: string): StatsBundle {
    const all = this.repo.listAppointments();
    const inRange = all.filter(
      (a) => a.start >= rangeStart && a.start < rangeEnd,
    );

    const total = inRange.length;
    const booked = inRange.filter((a) => a.status === 'booked').length;
    const completed = inRange.filter((a) => a.status === 'completed').length;
    const cancelled = inRange.filter((a) => a.status === 'cancelled').length;

    const cancellationRate = total === 0 ? 0 : round4(cancelled / total);

    const workMinutes = countWorkMinutes(rangeStart, rangeEnd);
    const occupiedMinutes = inRange
      .filter((a) => a.status === 'booked' || a.status === 'completed')
      .reduce((sum, a) => {
        const svc = this.repo.getService(a.serviceId);
        return sum + (svc ? svc.durationMin : 0);
      }, 0);
    const occupancyRate =
      workMinutes === 0 ? 0 : round4(occupiedMinutes / workMinutes);

    const serviceMap = new Map<string, number>();
    const cancellationMap = new Map<string, number>();
    const clientMap = new Map<string, number>();

    for (const a of inRange) {
      if (a.status === 'booked' || a.status === 'completed') {
        serviceMap.set(a.serviceId, (serviceMap.get(a.serviceId) || 0) + 1);
        clientMap.set(a.clientId, (clientMap.get(a.clientId) || 0) + 1);
      }
      if (a.status === 'cancelled') {
        cancellationMap.set(
          a.serviceId,
          (cancellationMap.get(a.serviceId) || 0) + 1,
        );
      }
    }

    const services = this.repo.listServices();
    const clients = this.repo.listClients();

    const serviceBookings: ServiceCount[] = services.map((s) => ({
      serviceId: s.id,
      count: serviceMap.get(s.id) || 0,
    }));

    const serviceCancellations: ServiceCount[] = services.map((s) => ({
      serviceId: s.id,
      count: cancellationMap.get(s.id) || 0,
    }));

    const clientVisits: ClientCount[] = clients.map((c) => ({
      clientId: c.id,
      count: clientMap.get(c.id) || 0,
    }));

    return {
      rangeStart,
      rangeEnd,
      appointmentsTotal: total,
      appointmentsBooked: booked,
      appointmentsCompleted: completed,
      appointmentsCancelled: cancelled,
      cancellationRate,
      occupancyRate,
      topServicesByBookings: topN(serviceBookings, (x) => x.count, (x) => x.serviceId, 5),
      topServicesByCancellations: topN(serviceCancellations, (x) => x.count, (x) => x.serviceId, 5),
      topClientsByVisits: topN(clientVisits, (x) => x.count, (x) => x.clientId, 5),
    };
  }
}
