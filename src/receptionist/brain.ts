import type { Clock, NotificationPort, SchedulerPort } from '../domain/ports';
import { parseIntent } from './intents';

const SERVICE_INFO: Record<
  string,
  { name: string; durationMin: number; priceCents: number; upsells: string[] }
> = {
  'svc-bano': {
    name: 'Baño completo',
    durationMin: 60,
    priceCents: 2500000,
    upsells: ['Corte de uñas', 'Limpieza dental'],
  },
  'svc-corte': {
    name: 'Corte y peinado',
    durationMin: 90,
    priceCents: 3500000,
    upsells: ['Corte de uñas'],
  },
  'svc-spa': {
    name: 'Spa de mascotas',
    durationMin: 120,
    priceCents: 5000000,
    upsells: ['Limpieza dental'],
  },
};

export function handleMessage({
  text,
  clientId,
  scheduler,
  notifier,
  clock,
}: {
  text: string;
  clientId: string;
  scheduler: SchedulerPort;
  notifier: NotificationPort;
  clock: Clock;
}): { reply: string } {
  const intent = parseIntent(text);
  const now = clock.now();

  switch (intent.type) {
    case 'book': {
      const serviceId = intent.entities.serviceId;
      if (!serviceId) {
        return { reply: '¿Qué servicio te gustaría agendar?' };
      }
      const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const slots = scheduler.getAvailability(serviceId, now, to);
      if (slots.length === 0) {
        return { reply: 'No hay disponibilidad para ese servicio en los próximos días.' };
      }
      const slot = slots[0];
      const appt = scheduler.book(clientId, serviceId, new Date(slot.start));

      notifier.notify({
        id: `n-${Date.now()}-conf`,
        clientId,
        kind: 'confirmation',
        body: `Cita confirmada para ${appt.start}`,
        createdAt: now.toISOString(),
      });

      const svc = SERVICE_INFO[serviceId];
      if (svc && svc.upsells.length > 0) {
        notifier.notify({
          id: `n-${Date.now()}-up`,
          clientId,
          kind: 'upsell',
          body: `¿Te gustaría agregar ${svc.upsells.join(', ')}?`,
          createdAt: now.toISOString(),
        });
      }

      return { reply: `¡Listo! Agendé tu cita para ${appt.start}.` };
    }

    case 'cancel': {
      const appointmentId = intent.entities.appointmentId;
      if (!appointmentId) {
        return { reply: '¿Qué cita quieres cancelar?' };
      }
      const { candidates } = scheduler.cancel(appointmentId);
      if (candidates.length > 0) {
        const first = candidates[0];
        notifier.notify({
          id: `n-${Date.now()}-bf`,
          clientId: first.clientId,
          kind: 'backfill_offer',
          body: `¡Hueco libre! ¿Quieres agendar para ${first.windowStart}?`,
          createdAt: now.toISOString(),
        });
      }
      return { reply: 'Cita cancelada.' };
    }

    case 'reschedule': {
      return {
        reply: 'Para reprogramar, cancela tu cita actual y agenda una nueva.',
      };
    }

    case 'info': {
      const serviceId = intent.entities.serviceId;
      if (serviceId && SERVICE_INFO[serviceId]) {
        const s = SERVICE_INFO[serviceId];
        return {
          reply: `${s.name}: ${s.durationMin} min, $${(s.priceCents / 100).toFixed(0)}`,
        };
      }
      return {
        reply:
          'Ofrecemos baño completo, corte y peinado, y spa de mascotas. ¿Sobre cuál quieres info?',
      };
    }

    default: {
      return {
        reply: 'No entendí bien. ¿Quieres agendar, cancelar o saber precios?',
      };
    }
  }
}
