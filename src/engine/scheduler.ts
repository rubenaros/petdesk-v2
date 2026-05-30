import type { Clock, Repository, SchedulerPort } from '../domain/ports';
import type { Appointment, ReminderJob, Slot } from '../domain/types';

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

function iso(d: Date): string {
  return d.toISOString();
}

function parseIso(s: string): Date {
  return new Date(s);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export class Scheduler implements SchedulerPort {
  constructor(
    private repo: Repository,
    private clock: Clock,
  ) {}

  getAvailability(serviceId: string, from: Date, to: Date): Slot[] {
    const svc = this.repo.getService(serviceId);
    if (!svc) return [];

    const duration = svc.durationMin;
    const slots: Slot[] = [];

    const startDay = new Date(from);
    startDay.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(to);
    endDay.setUTCHours(0, 0, 0, 0);

    for (let d = new Date(startDay); d <= endDay; d.setUTCDate(d.getUTCDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setUTCHours(9, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setUTCHours(18, 0, 0, 0);

      if (dayEnd < from || dayStart > to) continue;

      for (let t = new Date(dayStart); t < dayEnd; t.setUTCMinutes(t.getUTCMinutes() + duration)) {
        const slotEnd = new Date(t.getTime() + duration * 60_000);
        if (slotEnd > dayEnd) break;
        if (slotEnd < from || t > to) continue;

        const appts = this.repo.listAppointments();
        const conflict = appts.some((a) =>
          a.status === 'booked' &&
          overlaps(t, slotEnd, parseIso(a.start), parseIso(a.end)),
        );

        if (!conflict) {
          slots.push({ start: iso(t), end: iso(slotEnd) });
        }
      }
    }

    return slots;
  }

  book(clientId: string, serviceId: string, start: Date): Appointment {
    const svc = this.repo.getService(serviceId);
    if (!svc) throw new Error(`Service not found: ${serviceId}`);

    const end = new Date(start.getTime() + svc.durationMin * 60_000);

    const conflict = this.repo.listAppointments().some(
      (a) => a.status === 'booked' && overlaps(start, end, parseIso(a.start), parseIso(a.end)),
    );
    if (conflict) {
      throw new Error('Slot overlaps with an existing booked appointment');
    }

    const appt: Appointment = {
      id: nextId('appt'),
      clientId,
      serviceId,
      start: iso(start),
      end: iso(end),
      status: 'booked',
    };
    this.repo.saveAppointment(appt);

    const dueAt = new Date(start.getTime() - 24 * 60 * 60_000);
    const reminder: ReminderJob = {
      id: nextId('rem'),
      appointmentId: appt.id,
      dueAt: iso(dueAt),
      sent: false,
    };
    this.repo.saveReminder(reminder);

    return appt;
  }

  reschedule(appointmentId: string, newStart: Date): Appointment {
    const appt = this.repo.getAppointment(appointmentId);
    if (!appt) throw new Error(`Appointment not found: ${appointmentId}`);

    const svc = this.repo.getService(appt.serviceId);
    if (!svc) throw new Error(`Service not found: ${appt.serviceId}`);

    const newEnd = new Date(newStart.getTime() + svc.durationMin * 60_000);

    const conflict = this.repo.listAppointments().some(
      (a) =>
        a.id !== appointmentId &&
        a.status === 'booked' &&
        overlaps(newStart, newEnd, parseIso(a.start), parseIso(a.end)),
    );
    if (conflict) {
      throw new Error('Slot overlaps with an existing booked appointment');
    }

    const updated: Appointment = {
      ...appt,
      start: iso(newStart),
      end: iso(newEnd),
    };
    this.repo.saveAppointment(updated);

    // Re-schedule reminder: update dueAt to 24h before new start
    const reminders = this.repo.listReminders();
    const existing = reminders.find((r) => r.appointmentId === appointmentId);
    if (existing) {
      const newDueAt = new Date(newStart.getTime() - 24 * 60 * 60_000);
      this.repo.saveReminder({
        ...existing,
        dueAt: iso(newDueAt),
      });
    }

    return updated;
  }

  cancel(appointmentId: string): { freed: Slot; candidates: import('../domain/types').WaitlistEntry[] } {
    const appt = this.repo.getAppointment(appointmentId);
    if (!appt) throw new Error(`Appointment not found: ${appointmentId}`);

    const updated: Appointment = { ...appt, status: 'cancelled' };
    this.repo.saveAppointment(updated);

    const freed: Slot = { start: appt.start, end: appt.end };
    const freedStart = parseIso(appt.start);
    const freedEnd = parseIso(appt.end);

    const candidates = this.repo
      .listWaitlist()
      .filter((w) => {
        if (w.serviceId !== appt.serviceId) return false;
        const winStart = parseIso(w.windowStart);
        const winEnd = parseIso(w.windowEnd);
        // Ventana contiene el slot liberado
        return winStart <= freedStart && winEnd >= freedEnd;
      })
      .sort((a, b) => parseIso(a.createdAt).getTime() - parseIso(b.createdAt).getTime());

    return { freed, candidates };
  }

  dueReminders(now: Date): ReminderJob[] {
    return this.repo
      .listReminders()
      .filter((r) => !r.sent && parseIso(r.dueAt).getTime() <= now.getTime());
  }
}
