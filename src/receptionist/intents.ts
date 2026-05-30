const SERVICE_KEYWORDS: Record<string, string> = {
  baño: 'svc-bano',
  corte: 'svc-corte',
  peinado: 'svc-corte',
  spa: 'svc-spa',
};

const KEYWORDS = {
  book: ['agendar', 'reservar', 'cita', 'quiero', 'necesito'],
  cancel: ['cancelar', 'anular', 'eliminar'],
  reschedule: ['reprogramar', 'cambiar', 'mover'],
  info: ['precio', 'precios', 'horario', 'horarios', 'cuánto', 'cuanto', 'costo', 'info', 'información', 'informacion'],
};

export function parseIntent(text: string): {
  type: 'book' | 'reschedule' | 'cancel' | 'info' | 'unknown';
  entities: Record<string, string>;
} {
  const lower = text.toLowerCase();
  const entities: Record<string, string> = {};

  for (const [kw, id] of Object.entries(SERVICE_KEYWORDS)) {
    if (lower.includes(kw)) {
      entities.serviceId = id;
      break;
    }
  }

  const apptMatch = lower.match(/\b(appt-[a-z0-9-]+)\b/);
  if (apptMatch) {
    entities.appointmentId = apptMatch[1];
  }

  let type: 'book' | 'reschedule' | 'cancel' | 'info' | 'unknown' = 'unknown';

  if (KEYWORDS.cancel.some((k) => lower.includes(k))) type = 'cancel';
  else if (KEYWORDS.reschedule.some((k) => lower.includes(k))) type = 'reschedule';
  else if (KEYWORDS.book.some((k) => lower.includes(k))) type = 'book';
  else if (KEYWORDS.info.some((k) => lower.includes(k))) type = 'info';
  else if (entities.serviceId) type = 'book';

  return { type, entities };
}
