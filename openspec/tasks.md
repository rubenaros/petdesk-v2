# SDD Tasks — Stats Dashboard (v6)

## T1 — Implementar StatsEngine
**Archivo**: `src/engine/stats.ts`  
**Criterio**: clase con `compute()` que devuelve `StatsBundle` correcto para cualquier rango.

## T2 — Implementar API /api/stats
**Archivo**: `src/app/api/stats/route.ts`  
**Criterio**: GET con query params `start`/`end` (default últimos 30 días), devuelve `{ stats }`.

## T3 — Integrar Stats en Dashboard
**Archivo**: `src/app/dashboard/page.tsx`  
**Criterio**: sección "Estadísticas" visible, fetch + polling 5s, muestra total/cancelación/ocupación/top3.

## T4 — Tests unitarios y edge cases
**Archivo**: `tests/engine.test.ts` (añadir), `tests/engine.edge.test.ts` (añadir)  
**Criterio**: tests pasan, cubren rango vacío, todo cancelado, empates, ocupación parcial.

## T5 — Verificación
**Comandos**: `npm test && npm run lint && npm run build`  
**Criterio**: los 3 comandos pasan en verde.

## T6 — Entrega
**Comandos**: branch, commit, push, PR, auto-merge  
**Criterio**: PR creado con body que incluye checklist del issue y artefactos SDD.
