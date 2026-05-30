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

describe('brain edge cases', () => {
  it('intent ambiguo (cancelar + agendar) -> prioriza cancel', () => {
    const notifier = new InAppNotifier();
    const scheduler = createFakeScheduler();
    const now = new Date('2026-05-30T10:00:00.000Z');

    const { reply } = handleMessage({
      text: 'quiero cancelar y agendar otra cosa',
      clientId: 'cli-test',
      scheduler,
      notifier,
      clock: fixedClock(now),
    });

    // El parser prioriza cancel sobre book; sin appointmentId pide clarificación
    expect(reply).toBe('¿Qué cita quieres cancelar?');
    expect(scheduler.cancel).not.toHaveBeenCalled();
  });

  it('cancel de cita inexistente -> lanza error del scheduler', () => {
    const notifier = new InAppNotifier();
    const scheduler = createFakeScheduler({
      cancel: vi.fn().mockImplementation(() => {
        throw new Error('Appointment not found: appt-fake');
      }),
    });
    const now = new Date('2026-05-30T10:00:00.000Z');

    expect(() =>
      handleMessage({
        text: 'cancelar appt-fake',
        clientId: 'cli-test',
        scheduler,
        notifier,
        clock: fixedClock(now),
      }),
    ).toThrow('Appointment not found: appt-fake');
  });

  it('book cuando no hay disponibilidad -> no llama a book y responde sin disponibilidad', () => {
    const notifier = new InAppNotifier();
    const scheduler = createFakeScheduler({
      getAvailability: vi.fn().mockReturnValue([]),
    });
    const now = new Date('2026-05-30T10:00:00.000Z');

    const { reply } = handleMessage({
      text: 'agendar baño',
      clientId: 'cli-test',
      scheduler,
      notifier,
      clock: fixedClock(now),
    });

    expect(reply).toBe('No hay disponibilidad para ese servicio en los próximos días.');
    expect(scheduler.book).not.toHaveBeenCalled();
    expect(notifier.list()).toHaveLength(0);
  });
});
