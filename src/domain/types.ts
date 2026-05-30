// Tipos de dominio de PetDesk. Tiempos como ISO 8601 string (UTC).
// Ver docs/PLAN.md para el contexto de arquitectura.

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  upsells: string[]; // nombres de servicios sugeridos tras reservar
}

export interface Client {
  id: string;
  name: string;
  phone: string;
}

export type AppointmentStatus = 'booked' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  start: string; // ISO
  end: string; // ISO
  status: AppointmentStatus;
}

export interface WaitlistEntry {
  id: string;
  clientId: string;
  serviceId: string;
  windowStart: string; // ISO — inicio de la ventana en que el cliente acepta un hueco
  windowEnd: string; // ISO — fin de la ventana
  createdAt: string; // ISO — usado para orden FIFO del backfill
}

export interface ReminderJob {
  id: string;
  appointmentId: string;
  dueAt: string; // ISO — cuándo debe dispararse el recordatorio
  sent: boolean;
}

export type NotificationKind =
  | 'confirmation'
  | 'upsell'
  | 'backfill_offer'
  | 'reminder';

export interface Notification {
  id: string;
  clientId: string;
  kind: NotificationKind;
  body: string;
  createdAt: string; // ISO
}

export interface Slot {
  start: string; // ISO
  end: string; // ISO
}
