import { describe, expect, it } from 'vitest';
import { Scheduler } from '../src/engine/scheduler';
import { handleMessage } from '../src/receptionist/brain';
import { InAppNotifier } from '../src/infra/inAppNotifier';
import { InMemoryRepo } from '../src/infra/memoryRepo';

function fixedClock(now: Date) {
  return { now: () => now };
}

describe('backfill e2e', () => {
  it('A agendado; B y C en waitlist FIFO; A cancela -> oferta a B; B acepta -> slot booked por B', () => {
    const now = new Date('2099-01-01T08:00:00.000Z');
    const clock = fixedClock(now);

    const repo = new InMemoryRepo(false);
    const scheduler = new Scheduler(repo, clock);
    const notifier = new InAppNotifier();

    // Seed services
    const svc = { id: 'svc-bano', name: 'Baño', durationMin: 60, priceCents: 100, upsells: [] };
    repo.saveService(svc);

    // Seed clients
    const clientA = { id: 'cli-a', name: 'Alice', phone: '111' };
    const clientB = { id: 'cli-b', name: 'Bob', phone: '222' };
    const clientC = { id: 'cli-c', name: 'Carol', phone: '333' };
    const clientD = { id: 'cli-d', name: 'Dave', phone: '444' };
    repo.saveClient(clientA);
    repo.saveClient(clientB);
    repo.saveClient(clientC);
    repo.saveClient(clientD);

    // A books a slot far in the future
    const slotStart = new Date('2099-01-01T10:00:00.000Z');
    const apptA = scheduler.book(clientA.id, svc.id, slotStart);
    expect(apptA.status).toBe('booked');
    expect(apptA.clientId).toBe(clientA.id);

    // D books the 09:00 slot so that 10:00 becomes the first available after A cancels
    scheduler.book(clientD.id, svc.id, new Date('2099-01-01T09:00:00.000Z'));

    // B and C join waitlist for the same service, window covering the slot
    // B first (earlier createdAt), then C
    const windowStart = new Date('2099-01-01T08:00:00.000Z').toISOString();
    const windowEnd = new Date('2099-01-01T12:00:00.000Z').toISOString();
    repo.saveWaitlistEntry({
      id: 'wl-b',
      clientId: clientB.id,
      serviceId: svc.id,
      windowStart,
      windowEnd,
      createdAt: '2026-05-30T09:00:00.000Z',
    });
    repo.saveWaitlistEntry({
      id: 'wl-c',
      clientId: clientC.id,
      serviceId: svc.id,
      windowStart,
      windowEnd,
      createdAt: '2026-05-30T09:30:00.000Z',
    });

    // A cancels via brain
    const cancelResult = handleMessage({
      text: `cancelar ${apptA.id}`,
      clientId: clientA.id,
      scheduler,
      notifier,
      clock,
    });
    expect(cancelResult.reply).toBe('Cita cancelada.');

    // Verify A's appointment is cancelled
    expect(repo.getAppointment(apptA.id)?.status).toBe('cancelled');

    // Verify backfill_offer was sent to B (first FIFO), not C
    const notifications = notifier.list();
    const backfillOffers = notifications.filter((n) => n.kind === 'backfill_offer');
    expect(backfillOffers).toHaveLength(1);
    expect(backfillOffers[0].clientId).toBe(clientB.id);
    expect(backfillOffers[0].body).toContain('Hueco libre');

    // B accepts by booking again — the freed slot should be the first available
    const bookResult = handleMessage({
      text: 'agendar baño',
      clientId: clientB.id,
      scheduler,
      notifier,
      clock,
    });
    expect(bookResult.reply).toContain('Agendé');

    // Verify the new appointment is booked by B in the same slot
    const allAppts = repo.listAppointments();
    const apptB = allAppts.find((a) => a.clientId === clientB.id && a.status === 'booked');
    expect(apptB).toBeDefined();
    expect(apptB!.start).toBe(slotStart.toISOString());
    expect(apptB!.serviceId).toBe(svc.id);

    // Verify A's appointment is cancelled and B's is booked (D also has a booked slot at 09:00)
    const bookedAppts = allAppts.filter((a) => a.status === 'booked');
    expect(bookedAppts).toHaveLength(2);
    expect(bookedAppts.map((a) => a.clientId).sort()).toEqual([clientB.id, clientD.id]);
  });
});
