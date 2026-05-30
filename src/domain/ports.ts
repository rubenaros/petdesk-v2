// Puertos (interfaces) de PetDesk. Los devs implementan/consumen estas interfaces;
// permiten paralelismo (Dev Chat codea contra SchedulerPort sin la implementación de Dev Motor)
// y el swap de infraestructura (InMemoryRepo -> DB, InAppNotifier -> email/SMS) sin tocar la lógica.
// Ver docs/PLAN.md.

import type {
  Appointment,
  Client,
  Notification,
  ReminderJob,
  Service,
  Slot,
  WaitlistEntry,
} from './types';

// Reloj inyectable -> tests deterministas y "avanzar tiempo" en la demo.
export interface Clock {
  now(): Date;
}

// Persistencia. Síncrona para el MVP en memoria; el swap a DB es fase posterior.
export interface Repository {
  // Services
  listServices(): Service[];
  getService(id: string): Service | undefined;
  // Clients
  listClients(): Client[];
  getClient(id: string): Client | undefined;
  saveClient(client: Client): void;
  // Appointments
  listAppointments(): Appointment[];
  getAppointment(id: string): Appointment | undefined;
  saveAppointment(appointment: Appointment): void;
  // Waitlist
  listWaitlist(): WaitlistEntry[];
  saveWaitlistEntry(entry: WaitlistEntry): void;
  // Reminders
  listReminders(): ReminderJob[];
  saveReminder(reminder: ReminderJob): void;
  // Notifications
  listNotifications(): Notification[];
  saveNotification(notification: Notification): void;
}

// Motor de agenda. El backfill vive en cancel(): libera el slot y devuelve los
// WaitlistEntry candidatos (mismo servicio, ventana que contiene el slot) en orden FIFO.
export interface SchedulerPort {
  getAvailability(serviceId: string, from: Date, to: Date): Slot[];
  book(clientId: string, serviceId: string, start: Date): Appointment; // lanza si solapa
  reschedule(appointmentId: string, newStart: Date): Appointment;
  cancel(appointmentId: string): { freed: Slot; candidates: WaitlistEntry[] };
  dueReminders(now: Date): ReminderJob[];
}

// Salida de avisos. InAppNotifier (feed in-app) ahora; email/SMS/push después.
export interface NotificationPort {
  notify(notification: Notification): void;
  list(): Notification[];
}
