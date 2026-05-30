# PLAN — PetDesk v2

**Fecha:** 2026-05-30
**Versión:** v2 (aplicando lecciones del v1 — ver `AgentCode/docs/QUE-APRENDIMOS-V2.md`)

---

## Producto

Recepcionista IA para negocios de cita previa (beachhead: pet grooming). **MVP web sin SMS**: chat de reservas + dashboard del groomer. **Núcleo defendible**: backfill de cancelaciones.

Mismo producto que v1; lo que cambia es el **proceso de construcción**.

---

## Qué hay en el template (ya hecho, los agentes NO lo tocan)

✅ **Andamiaje completo** — Next.js 16 + TS + Tailwind 4 + Vitest 4
✅ **Contratos** — `src/domain/types.ts`, `src/domain/ports.ts` (inmutables, protegidos por CODEOWNERS)
✅ **Infra base** — `src/infra/memoryRepo.ts` (sembrado), `src/infra/systemClock.ts`
✅ **Spec ejecutable** — `tests/contracts/*.contract.ts` (property-based con fast-check)
✅ **Constitución** — `CONSTITUTION.md` (Karpathy + reglas duras del proyecto)
✅ **CI/CD** — `.github/workflows/ci.yml` (lint + test + build en cada push/PR)
✅ **Linter tuneado** — `eslint.config.mjs` con overrides para tests (`any` permitido en fakes)
✅ **`.gitignore` agresivo** — `*.tsbuildinfo`, `.next/`, `coverage/`, swap files
✅ **CODEOWNERS** — bloquea cambios a `src/domain/`, `tests/contracts/`, `CONSTITUTION.md`

→ Issue 0 (scaffold) y Issue 5 (deploy/CI) del v1 **DESAPARECEN** — están en el template.

---

## Issues (4 totales) con marcadores `[P]` paralelos

Convención: `[P]` = puede correr en paralelo con otros `[P]` de la misma ola.

### Ola 1 — paralela (2 agentes simultáneos)

#### Issue 1 — Motor de agenda [P]
- **Agente:** `Dev Motor` (Kimi)
- **Dir:** `src/engine/scheduler.ts` (único archivo de código nuevo)
- **Tests del agente:** `tests/engine.test.ts` (importa `schedulerPortContract` y le pasa el Scheduler nuevo)
- **Depende de:** contratos en `src/domain/` (ya en template)
- **Costo estimado:** ~$0.50

#### Issue 2 — Cerebro recepcionista [P]
- **Agente:** `Dev Chat` (Kimi)
- **Dir:**
  - `src/receptionist/intents.ts` (parser por keywords)
  - `src/receptionist/brain.ts` (handleMessage con backfill+upsell)
  - `src/infra/inAppNotifier.ts` (implementa NotificationPort)
- **Tests del agente:**
  - `tests/notifier.test.ts` (importa `notificationPortContract`, pasa el InAppNotifier)
  - `tests/brain.test.ts` (tests del cerebro con fake SchedulerPort)
- **Depende de:** contratos en `src/domain/` (ya en template). Usa `SchedulerPort` como INTERFAZ — no la implementación de Dev Motor.
- **Costo estimado:** ~$0.60

### Ola 2 — paralela (2 agentes, tras mergear Issues 1 y 2)

#### Issue 3 — Frontend (landing + chat + dashboard + APIs) [P]
- **Agente:** `Dev Front` (**DeepSeek V3.2** — UI mecánica, ~5× más barato)
- **Dir:**
  - `src/app/page.tsx` (landing pet grooming)
  - `src/app/chat/page.tsx` (chat widget cliente)
  - `src/app/dashboard/page.tsx` (panel groomer + feed + "avanzar tiempo")
  - `src/app/api/message/route.ts`, `src/app/api/appointments/route.ts`, `.../cancel/route.ts`, `.../notifications/route.ts`
- **Depende de:** Issues 1 y 2 mergeados (importa engine + brain reales).
- **Costo estimado:** ~$0.15 (DeepSeek)

#### Issue 4 — QA y e2e backfill [P]
- **Agente:** `QA` (Kimi — rigor)
- **Dir:** solo `tests/` (no agrega/modifica código de prod)
  - `tests/backfill.e2e.test.ts` (escenario estrella: A agendado, B+C waitlist FIFO, A cancela → oferta a B; B acepta → slot booked por B)
  - Casos límite adicionales en `tests/engine.test.ts` y `tests/brain.test.ts` (doble-booking, cancelar sin waitlist, ventana que no matchea)
- **Depende de:** Issues 1 y 2 mergeados.
- **Costo estimado:** ~$0.50

### Total estimado del v2: **~$1.75** (vs $4.21 del v1)

---

## Orden de ejecución

```
                ┌────────────────┐
                │  main (template) │
                └────────┬─────────┘
                         │
        ┌────────────────┴────────────────┐
        │ Ola 1 [P] (2 agentes en paralelo) │
        │  • Issue 1 — Dev Motor / Kimi    │
        │  • Issue 2 — Dev Chat  / Kimi    │
        └────────────────┬────────────────┘
                         │ (mergeo en orden, Autopilot si está)
                         ▼
        ┌────────────────┴────────────────┐
        │ Ola 2 [P] (2 agentes en paralelo) │
        │  • Issue 3 — Dev Front / DeepSeek │
        │  • Issue 4 — QA       / Kimi     │
        └────────────────┬────────────────┘
                         │ (mergeo final + verifico integración)
                         ▼
                    Vercel auto-deploy
```

---

## Checklist por issue (estilo Spec-Kit)

Cada agente debe **marcar cada item** en el cuerpo del PR antes de hacer merge.

### Checklist universal (todos los issues)
- [ ] Leí `CONSTITUTION.md` y respeté las reglas duras.
- [ ] Solo toqué los archivos listados en mi issue (sección "Dir").
- [ ] No modifiqué `src/domain/**` ni `tests/contracts/**` ni `CONSTITUTION.md`.
- [ ] `npm run lint` pasa (0 errores).
- [ ] `npm test` pasa (incluidos los contract tests que apliquen).
- [ ] `npm run build` compila sin errores.
- [ ] Push a `feat/petdesk-v2-<N>` con commit mensaje claro.
- [ ] `gh pr create` con título y body explicando qué hice y cómo verificar.

### Checklist específica
- **Issue 1**: contract test `SchedulerPort` corriendo sobre mi `Scheduler` → pasa.
- **Issue 2**: contract test `NotificationPort` corriendo sobre mi `InAppNotifier` → pasa; brain emite `backfill_offer` al primer FIFO.
- **Issue 3**: en `npm run dev`, `/chat` responde "FUNCIONA" a un mensaje, `/dashboard` cancela y muestra oferta de backfill en el feed.
- **Issue 4**: test e2e de backfill end-to-end (A→B aceptación) verde + ≥3 casos límite agregados.

---

## Cómo se asigna y dispara

Mismo patrón que v1, pero con dos cambios clave:

1. **Cost routing por agente** (al crear): `Dev Front` se crea con `--model openrouter/deepseek/deepseek-chat`. Los demás heredan Kimi del default de OpenCode.

2. **Autopilot (si funciona en v0.3.6)** — regla: "Issue X.status=in_review + PR mergeable + CI green → auto-merge + done + asignar siguiente issue dependiente". Si no hay Autopilot disponible, se cae al patrón manual del v1.

---

## Cómo medir el v2 vs v1

Al cerrar:
| Métrica | v1 | v2 (apuesta) |
|---|---|---|
| Costo OpenRouter | $4.21 | $1.50–2.00 |
| Tiempo de reloj total | ~3h | ~45–60 min |
| Intervenciones humanas | ~12 | ≤3 |
| PRs rotos por scope creep | 2 (QA tocó ports, Deploy tocó brain) | 0 (CODEOWNERS bloquea) |
| Errores de contratos | 1 (agente reintrodujo SMS) | 0 (contract tests fallan si los rompe) |
