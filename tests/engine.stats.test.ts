import { describe, it, expect } from 'vitest';
import { InMemoryRepo } from '../src/infra/memoryRepo';
import { StatsEngine } from '../src/engine/stats';
import { Service, Client, Appointment } from '../src/domain/types';

function makeRepo(): InMemoryRepo {
  return new InMemoryRepo(false);
}

function addService(repo: InMemoryRepo, svc: Service): void {
  repo.saveService(svc);
}

function addClient(repo: InMemoryRepo, cli: Client): void {
  repo.saveClient(cli);
}

function addAppointment(repo: InMemoryRepo, appt: Appointment): void {
  repo.saveAppointment(appt);
}

describe('StatsEngine', () => {
  it('rango vacío devuelve ceros', () => {
    const repo = makeRepo();
    const engine = new StatsEngine(repo);

    const result = engine.compute(
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-02T00:00:00Z'),
    );

    expect(result.appointmentsTotal).toBe(0);
    expect(result.appointmentsBooked).toBe(0);
    expect(result.appointmentsCompleted).toBe(0);
    expect(result.appointmentsCancelled).toBe(0);
    expect(result.cancellationRate).toBe(0);
    expect(result.occupancyRate).toBe(0);
    expect(result.topServicesByBookings).toEqual([]);
    expect(result.topServicesByCancellations).toEqual([]);
    expect(result.topClientsByVisits).toEqual([]);
  });

  it('rango con solo cancelaciones', () => {
    const repo = makeRepo();
    addService(repo, { id: 'svc-a', name: 'A', durationMin: 30, priceCents: 100, upsells: [] });
    addClient(repo, { id: 'cli-1', name: 'Alice', phone: '111' });
    addAppointment(repo, {
      id: 'appt-1',
      clientId: 'cli-1',
      serviceId: 'svc-a',
      start: '2026-06-01T10:00:00Z',
      end: '2026-06-01T10:30:00Z',
      status: 'cancelled',
    });

    const engine = new StatsEngine(repo);
    const result = engine.compute(
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-02T00:00:00Z'),
    );

    expect(result.appointmentsTotal).toBe(1);
    expect(result.appointmentsCancelled).toBe(1);
    expect(result.appointmentsBooked).toBe(0);
    expect(result.appointmentsCompleted).toBe(0);
    expect(result.cancellationRate).toBe(1);
    expect(result.occupancyRate).toBe(0);
    expect(result.topServicesByCancellations).toEqual([{ serviceId: 'svc-a', count: 1 }]);
    expect(result.topServicesByBookings).toEqual([]);
    expect(result.topClientsByVisits).toEqual([]);
  });

  it('occupancy 100% — un día completo de 9h a 18h ocupado', () => {
    const repo = makeRepo();
    addService(repo, { id: 'svc-1h', name: '1h', durationMin: 60, priceCents: 100, upsells: [] });
    addClient(repo, { id: 'cli-1', name: 'Alice', phone: '111' });

    // 9 citas de 1h cada una, de 9:00 a 18:00 en un día
    for (let h = 9; h < 18; h++) {
      addAppointment(repo, {
        id: `appt-${h}`,
        clientId: 'cli-1',
        serviceId: 'svc-1h',
        start: `2026-06-01T${String(h).padStart(2, '0')}:00:00Z`,
        end: `2026-06-01T${String(h + 1).padStart(2, '0')}:00:00Z`,
        status: 'booked',
      });
    }

    const engine = new StatsEngine(repo);
    const result = engine.compute(
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-02T00:00:00Z'),
    );

    expect(result.appointmentsTotal).toBe(9);
    expect(result.appointmentsBooked).toBe(9);
    expect(result.occupancyRate).toBe(1); // 9h / 9h
  });

  it('ties en tops — orden estable por count desc', () => {
    const repo = makeRepo();
    addService(repo, { id: 'svc-a', name: 'A', durationMin: 30, priceCents: 100, upsells: [] });
    addService(repo, { id: 'svc-b', name: 'B', durationMin: 30, priceCents: 100, upsells: [] });
    addClient(repo, { id: 'cli-1', name: 'Alice', phone: '111' });

    // 3 de svc-a, 3 de svc-b (empate)
    for (let i = 0; i < 3; i++) {
      addAppointment(repo, {
        id: `appt-a-${i}`,
        clientId: 'cli-1',
        serviceId: 'svc-a',
        start: `2026-06-01T${10 + i}:00:00Z`,
        end: `2026-06-01T${10 + i}:30:00Z`,
        status: 'booked',
      });
      addAppointment(repo, {
        id: `appt-b-${i}`,
        clientId: 'cli-1',
        serviceId: 'svc-b',
        start: `2026-06-01T${13 + i}:00:00Z`,
        end: `2026-06-01T${13 + i}:30:00Z`,
        status: 'booked',
      });
    }

    const engine = new StatsEngine(repo);
    const result = engine.compute(
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-02T00:00:00Z'),
    );

    // Deben aparecer ambos con count=3
    expect(result.topServicesByBookings).toHaveLength(2);
    expect(result.topServicesByBookings[0].count).toBe(3);
    expect(result.topServicesByBookings[1].count).toBe(3);
  });

  it('múltiples clientes — topClientsByVisits correcto', () => {
    const repo = makeRepo();
    addService(repo, { id: 'svc-a', name: 'A', durationMin: 30, priceCents: 100, upsells: [] });
    addClient(repo, { id: 'cli-1', name: 'Alice', phone: '111' });
    addClient(repo, { id: 'cli-2', name: 'Bob', phone: '222' });

    // Alice: 3 citas, Bob: 1 cita
    for (let i = 0; i < 3; i++) {
      addAppointment(repo, {
        id: `appt-a-${i}`,
        clientId: 'cli-1',
        serviceId: 'svc-a',
        start: `2026-06-01T${10 + i}:00:00Z`,
        end: `2026-06-01T${10 + i}:30:00Z`,
        status: 'booked',
      });
    }
    addAppointment(repo, {
      id: 'appt-b-0',
      clientId: 'cli-2',
      serviceId: 'svc-a',
      start: '2026-06-01T13:00:00Z',
      end: '2026-06-01T13:30:00Z',
      status: 'completed',
    });

    const engine = new StatsEngine(repo);
    const result = engine.compute(
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-02T00:00:00Z'),
    );

    expect(result.topClientsByVisits).toEqual([
      { clientId: 'cli-1', count: 3 },
      { clientId: 'cli-2', count: 1 },
    ]);
  });

  it('mix de estados — cancellationRate y occupancyRate correctos', () => {
    const repo = makeRepo();
    addService(repo, { id: 'svc-60', name: '60min', durationMin: 60, priceCents: 100, upsells: [] });
    addClient(repo, { id: 'cli-1', name: 'Alice', phone: '111' });

    // 3 citas: 1 booked (60min), 1 completed (60min), 1 cancelled
    addAppointment(repo, {
      id: 'appt-1',
      clientId: 'cli-1',
      serviceId: 'svc-60',
      start: '2026-06-01T10:00:00Z',
      end: '2026-06-01T11:00:00Z',
      status: 'booked',
    });
    addAppointment(repo, {
      id: 'appt-2',
      clientId: 'cli-1',
      serviceId: 'svc-60',
      start: '2026-06-01T11:00:00Z',
      end: '2026-06-01T12:00:00Z',
      status: 'completed',
    });
    addAppointment(repo, {
      id: 'appt-3',
      clientId: 'cli-1',
      serviceId: 'svc-60',
      start: '2026-06-01T12:00:00Z',
      end: '2026-06-01T13:00:00Z',
      status: 'cancelled',
    });

    const engine = new StatsEngine(repo);
    const result = engine.compute(
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-02T00:00:00Z'),
    );

    expect(result.appointmentsTotal).toBe(3);
    expect(result.appointmentsBooked).toBe(1);
    expect(result.appointmentsCompleted).toBe(1);
    expect(result.appointmentsCancelled).toBe(1);
    expect(result.cancellationRate).toBe(0.3333);
    // 2 citas no canceladas x 60min = 120min / 540min laborables = 0.2222
    expect(result.occupancyRate).toBe(0.2222);
  });
});
