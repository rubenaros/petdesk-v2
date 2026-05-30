import { describe, expect, it, vi } from 'vitest';
import { handleMessage } from '../src/receptionist/brain';
import { InAppNotifier } from '../src/infra/inAppNotifier';
import type { SchedulerPort } from '../src/domain/ports';

function createFakeScheduler(overrides: Partial<SchedulerPort> = {}): SchedulerPort {
  return {
    getAvailability: vi.fn().mockReturnValue([
      { start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T11:00:00.000Z' },
    ]),
    book: vi.fn().mockReturnValue({
      id: 'appt-new',
      clientId: 'cli-test',
      serviceId: 'svc-bano',
      start: '2099-01-01T10:00:00.000Z',
      end: '2099-01-01T11:00:00.000Z',
      status: 'booked' as const,
    }),
    reschedule: vi.fn(),
    cancel: vi.fn().mockReturnValue({
      freed: { start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T11:00:00.000Z' },
      candidates: [],
    }),
    dueReminders: vi.fn(),
    ...overrides,
  } as SchedulerPort;
}

function fixedClock(now: Date) {
  return { now: () => now };
}

describe('brain', () => {
  it('"agendar baño" -> book + reply + upsell', () => {
    const notifier = new InAppNotifier();
    const scheduler = createFakeScheduler();
    const now = new Date('2026-05-30T10:00:00.000Z');

    const { reply } = handleMessage({
      text: 'agendar baño',
      clientId: 'cli-test',
      scheduler,
      notifier,
      clock: fixedClock(now),
    });

    expect(reply).toContain('Agendé');
    expect(scheduler.book).toHaveBeenCalledWith(
      'cli-test',
      'svc-bano',
      new Date('2099-01-01T10:00:00.000Z'),
    );
    const notifications = notifier.list();
    expect(notifications).toHaveLength(2);
    expect(notifications[0].kind).toBe('confirmation');
    expect(notifications[1].kind).toBe('upsell');
  });

  it('cancelar con waitlist -> backfill_offer al primer candidato FIFO', () => {
    const notifier = new InAppNotifier();
    const candidates = [
      {
        id: 'w-a',
        clientId: 'cli-a',
        serviceId: 'svc-bano',
        windowStart: '2099-01-01T08:00:00.000Z',
        windowEnd: '2099-01-01T12:00:00.000Z',
        createdAt: '2026-05-30T10:00:00.000Z',
      },
      {
        id: 'w-b',
        clientId: 'cli-b',
        serviceId: 'svc-bano',
        windowStart: '2099-01-01T08:00:00.000Z',
        windowEnd: '2099-01-01T12:00:00.000Z',
        createdAt: '2026-05-30T11:00:00.000Z',
      },
    ];
    const scheduler = createFakeScheduler({
      cancel: vi.fn().mockReturnValue({
        freed: { start: '2099-01-01T10:00:00.000Z', end: '2099-01-01T11:00:00.000Z' },
        candidates,
      }),
    });
    const now = new Date('2026-05-30T10:00:00.000Z');

    const { reply } = handleMessage({
      text: 'cancelar appt-1',
      clientId: 'cli-test',
      scheduler,
      notifier,
      clock: fixedClock(now),
    });

    expect(reply).toBe('Cita cancelada.');
    const notifications = notifier.list();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].kind).toBe('backfill_offer');
    expect(notifications[0].clientId).toBe('cli-a');
  });

  it('intent desconocido -> fallback sin crash', () => {
    const notifier = new InAppNotifier();
    const scheduler = createFakeScheduler();
    const now = new Date('2026-05-30T10:00:00.000Z');

    const { reply } = handleMessage({
      text: 'blablabla xyz123',
      clientId: 'cli-test',
      scheduler,
      notifier,
      clock: fixedClock(now),
    });

    expect(reply).toBeDefined();
    expect(typeof reply).toBe('string');
    expect(notifier.list()).toHaveLength(0);
  });
});
