# PetDesk v2

Recepcionista IA para negocios de cita previa (beachhead: pet grooming). MVP web sin SMS: chat de reservas + dashboard del groomer. Núcleo defendible = **backfill de cancelaciones**.

> **v2** del showcase multiagente orquestado con Multica — aplicando las lecciones del v1 ([retrospectiva](https://github.com/rubenaros/AgentCode/blob/main/docs/COMO-LO-HICIMOS.md) y [plan v2](https://github.com/rubenaros/AgentCode/blob/main/docs/QUE-APRENDIMOS-V2.md)).

## Qué cambia respecto al v1

- **Template completo** (este repo): scaffold + contratos + contract tests + CI + CONSTITUTION. Los agentes solo construyen features.
- **Contratos bloqueados** vía `CODEOWNERS` (`src/domain/` requiere review del arquitecto).
- **Spec ejecutable** (`tests/contracts/*.contract.ts`) con `fast-check`: cualquier implementación de las interfaces debe pasarlos.
- **Cost routing por agente** (Frontend en DeepSeek, lógica en Kimi).
- **Autopilot** de Multica para el loop merge→siguiente issue (si v0.3.6 lo soporta).

## Estructura

```
src/
  domain/         # ⚠️ INMUTABLE (CODEOWNERS) — tipos + interfaces (puertos)
  engine/         # Dev Motor implementa SchedulerPort aquí
  receptionist/   # Dev Chat implementa intents + brain aquí
  infra/          # InMemoryRepo, InAppNotifier, SystemClock
  app/            # Dev Front: Next.js (landing, chat, dashboard, APIs)
tests/
  contracts/      # ⚠️ INMUTABLE (CODEOWNERS) — spec ejecutable
  *.test.ts       # tests del agente (importan contract suites y las ejecutan sobre su impl)
docs/PLAN.md      # plan de issues con [P] markers y checklist por issue
CONSTITUTION.md   # reglas duras (NO romper)
```

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind 4 · Vitest 4 + fast-check (property-based contract tests) · ESLint con overrides para tests · GitHub Actions CI · Vercel deploy.

## Correr local

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # Vitest (contracts + agente tests)
npm run lint     # ESLint
npm run build    # Next.js production build
```

## Estado

Template listo. Issues 1–4 a ser implementados por los agentes Multica. Ver `docs/PLAN.md`.

## Nota sobre datos

MVP usa `InMemoryRepo` (resetea en cold start de Vercel). Persistencia en DB y notificaciones email/SMS son fases posteriores — el contrato `Repository`/`NotificationPort` permite el swap sin tocar la lógica.
