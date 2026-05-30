# CONSTITUTION — PetDesk v2

> **Reglas duras del proyecto. Vigentes para CUALQUIER agente o humano que toque el código.**
> Inspirado en GitHub Spec-Kit (concepto "constitution"). Versionado en el repo.

---

## 1. Principios de código (Karpathy)

Aplicar en CADA tarea:

### 1.1 Pensar antes de codear
- Declara tus supuestos de forma explícita al inicio del trabajo.
- Si hay varias interpretaciones, NO elijas en silencio: descríbelas y elige la más razonable justificándola.
- Si existe un enfoque más simple, dilo.

### 1.2 Simplicidad primero
- El mínimo código que resuelve el problema. Nada especulativo.
- Sin features no pedidas, sin abstracciones para código de un solo uso, sin "flexibilidad" no solicitada, sin manejo de errores para escenarios imposibles.
- Si escribiste 200 líneas y caben en 50, reescríbelo. Pregúntate: "¿un senior diría que esto está sobrecomplicado?".

### 1.3 Cambios quirúrgicos
- Toca solo lo necesario. Cada línea cambiada debe rastrearse directamente al pedido.
- No "mejores" código adyacente, ni refactorices lo que no está roto, ni cambies estilo/formato/comentarios ajenos.
- Iguala el estilo existente aunque tú lo harías distinto.
- Elimina solo los imports/variables que TUS cambios dejaron huérfanos. Código muerto preexistente: MENCIÓNALO, no lo borres.

### 1.4 Ejecución dirigida por objetivos
- Convierte la tarea en un criterio de éxito verificable antes de empezar.
- Para multi-paso, declara un plan breve: paso → cómo se verifica.
- Itera hasta cumplir el criterio. Ejecuta tests/build cuando apliquen.

### 1.5 Cómo manejar dudas (corres SIN humano en vivo)
- NO puedes pausar y esperar respuesta a mitad de tarea.
- Ambigüedad de BAJO riesgo: elige lo razonable, DECLARA el supuesto y avanza.
- Solo ante decisiones de ALTO riesgo o IRREVERSIBLES: deja la pregunta concreta + opciones como tu resultado final.

---

## 2. Reglas duras del proyecto (NO romper)

### 2.1 Contratos son inmutables
- **`src/domain/types.ts` y `src/domain/ports.ts` son LEY.** No se modifican excepto por el Arquitecto humano vía PR explícito.
- Los tests en `tests/contracts/*.ts` son la spec ejecutable de esas interfaces. **CUALQUIER implementación debe pasarlos.**
- CODEOWNERS bloquea cambios a `src/domain/` (GitHub branch protection).

### 2.2 No reinicializar el repo
- **NO ejecutar `create-next-app`, `git init`, `npm init` ni similares sobre el repo existente.** El scaffold ya está. Si necesitas un paquete nuevo, `npm install <paquete>`.
- **NO borrar** `CONSTITUTION.md`, `docs/PLAN.md`, `.github/`, `.gitignore`, ni los configs raíz.

### 2.3 Disciplina de scope por directorio
- Cada agente toca SOLO su directorio:
  - `Dev Motor` → `src/engine/` + `tests/engine.test.ts`
  - `Dev Chat` (parser) → `src/receptionist/intents.ts` + `tests/intents.test.ts`
  - `Dev Chat` (brain) → `src/receptionist/brain.ts` + `tests/brain.test.ts`
  - `Dev Chat` (notifier) → `src/infra/inAppNotifier.ts`
  - `Dev Front` → `src/app/**`
  - `QA` → `tests/**` (puede AGREGAR, no modificar tests de otros sin justificar)
- Si crees que necesitas tocar fuera de tu dir → déjalo en un comentario del issue, no lo hagas.

### 2.4 Entrega obligatoria como PR
- Trabajas en una rama nueva `feat/petdesk-<N>`.
- Antes de abrir PR: `npm test` + `npm run lint` + `npm run build` deben pasar.
- `git push https://github.com/rubenaros/petdesk-v2.git HEAD:feat/petdesk-<N>` (directo a la URL — no asumas `origin`).
- `gh pr create --repo rubenaros/petdesk-v2 --base main --head feat/petdesk-<N> --title "..." --body "..."`.
- En el body del PR: marca la checklist del issue.

### 2.5 No commitear basura
- Respeta el `.gitignore`. NO commitees: `node_modules/`, `.next/`, `*.tsbuildinfo`, `.env`, `coverage/`, swap files.
- `.gitignore` es exhaustivo; si algo se cuela es bug del agente, no del config.

---

## 3. Stack y convenciones técnicas

- **Lenguaje:** TypeScript estricto.
- **Stack:** Next.js 16 (App Router) + React 19 + Tailwind 4 + Vitest 4 + fast-check.
- **Persistencia MVP:** `InMemoryRepo` (resetea en cold start de Vercel). Swap a DB = fase posterior.
- **NLU MVP:** parser por reglas/keywords. LLM real = fase posterior.
- **NotificationPort MVP:** `InAppNotifier` (feed in-app). Email/SMS/push = fase posterior.
- **Sync sobre async**: las interfaces de `Repository` y `SchedulerPort` son síncronas (simple, testeable). Async = fase posterior cuando entre DB.

---

## 4. Cuándo desviarse

Esta constitución se actualiza con PR explícito al arquitecto (rubenaros). Si una tarea te obliga a romper una regla:
1. PARA.
2. Deja un comentario en tu issue: "Necesito tocar X porque Y. Propongo Z."
3. NO mergees código que rompa estas reglas.

---

## 5. Validación automática

- **CI** (`.github/workflows/ci.yml`) corre: `lint`, `test`, `build`. PR rojo = no se mergea.
- **CODEOWNERS** (`.github/CODEOWNERS`) requiere review del arquitecto para `src/domain/`.
- **Contract tests** (`tests/contracts/*.ts`) son property-based con fast-check: cualquier implementación de las interfaces debe pasarlos.
