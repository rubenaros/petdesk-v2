import type { Repository } from '../domain/ports';
import type {
  Appointment,
  Client,
  Notification,
  ReminderJob,
  Service,
  WaitlistEntry,
} from '../domain/types';

// Repositorio en memoria para el MVP. Se siembra con datos demo al construirse.
// En Vercel un cold-start lo resetea (aceptable para demo). Swap a DB = fase posterior.
export class InMemoryRepo implements Repository {
  private services = new Map<string, Service>();
  private clients = new Map<string, Client>();
  private appointments = new Map<string, Appointment>();
  private waitlist = new Map<string, WaitlistEntry>();
  private reminders = new Map<string, ReminderJob>();
  private notifications = new Map<string, Notification>();

  constructor(seed = true) {
    if (seed) this.seed();
  }

  // --- Services ---
  listServices(): Service[] {
    return [...this.services.values()];
  }
  getService(id: string): Service | undefined {
    return this.services.get(id);
  }
  saveService(service: Service): void {
    this.services.set(service.id, service);
  }

  // --- Clients ---
  listClients(): Client[] {
    return [...this.clients.values()];
  }
  getClient(id: string): Client | undefined {
    return this.clients.get(id);
  }
  saveClient(client: Client): void {
    this.clients.set(client.id, client);
  }

  // --- Appointments ---
  listAppointments(): Appointment[] {
    return [...this.appointments.values()];
  }
  getAppointment(id: string): Appointment | undefined {
    return this.appointments.get(id);
  }
  saveAppointment(appointment: Appointment): void {
    this.appointments.set(appointment.id, appointment);
  }

  // --- Waitlist ---
  listWaitlist(): WaitlistEntry[] {
    return [...this.waitlist.values()];
  }
  saveWaitlistEntry(entry: WaitlistEntry): void {
    this.waitlist.set(entry.id, entry);
  }

  // --- Reminders ---
  listReminders(): ReminderJob[] {
    return [...this.reminders.values()];
  }
  saveReminder(reminder: ReminderJob): void {
    this.reminders.set(reminder.id, reminder);
  }

  // --- Notifications ---
  listNotifications(): Notification[] {
    return [...this.notifications.values()];
  }
  saveNotification(notification: Notification): void {
    this.notifications.set(notification.id, notification);
  }

  // --- Seed ---
  private seed(): void {
    const services: Service[] = [
      { id: 'svc-bano', name: 'Baño completo', durationMin: 60, priceCents: 2500000, upsells: ['Corte de uñas', 'Limpieza dental'] },
      { id: 'svc-corte', name: 'Corte y peinado', durationMin: 90, priceCents: 3500000, upsells: ['Corte de uñas'] },
      { id: 'svc-spa', name: 'Spa de mascotas', durationMin: 120, priceCents: 5000000, upsells: ['Limpieza dental'] },
    ];
    services.forEach((s) => this.services.set(s.id, s));

    const clients: Client[] = [
      { id: 'cli-ana', name: 'Ana Pérez', phone: '+56911111111' },
      { id: 'cli-bob', name: 'Roberto Díaz', phone: '+56922222222' },
    ];
    clients.forEach((c) => this.clients.set(c.id, c));

    // Una cita futura (mañana 10:00 UTC) para 'svc-bano'.
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setUTCHours(10, 0, 0, 0);
    const apptStart = tomorrow.toISOString();
    const apptEnd = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString();
    this.appointments.set('appt-1', {
      id: 'appt-1',
      clientId: 'cli-ana',
      serviceId: 'svc-bano',
      start: apptStart,
      end: apptEnd,
      status: 'booked',
    });

    // Dos en lista de espera para 'svc-bano', cuya ventana cubre ese horario (Bob primero, FIFO).
    const windowStart = new Date(tomorrow.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000).toISOString();
    this.waitlist.set('wl-1', {
      id: 'wl-1', clientId: 'cli-bob', serviceId: 'svc-bano',
      windowStart, windowEnd, createdAt: '2026-05-27T09:00:00.000Z',
    });
    this.waitlist.set('wl-2', {
      id: 'wl-2', clientId: 'cli-ana', serviceId: 'svc-bano',
      windowStart, windowEnd, createdAt: '2026-05-27T09:30:00.000Z',
    });
  }
}
