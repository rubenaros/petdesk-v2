# SDD Proposal — Stats Dashboard (v6)

## Intent
Añadir un motor de estadísticas, una API REST y una sección de dashboard para visualizar métricas del negocio de grooming.

## Scope
- `src/engine/stats.ts` — StatsEngine con método `compute(rangeStart, rangeEnd): StatsBundle`
- `src/app/api/stats/route.ts` — API GET `/api/stats?start=&end=`
- `src/app/dashboard/page.tsx` — sección "Estadísticas" con fetch + polling 5s
- `tests/engine.test.ts` — tests unitarios + edge cases

## Out of scope
- Persistencia de stats (se calculan on-the-fly).
- Filtros por servicio/cliente en la API (solo rango temporal).
- Exportar a CSV/PDF.

## Approach
1. Implementar StatsEngine como clase pura sobre Repository.
2. Exponer API que parsea query params con defaults (últimos 30 días).
3. Integrar en el dashboard existente con polling.
4. Tests: unitarios con repo sembrado, edge cases (vacío, todo cancelado, empates).

## Success criteria
- `npm test` pasa (incluyendo tests nuevos).
- `npm run lint` 0 errores.
- `npm run build` compila.
- Dashboard muestra total, cancelación %, ocupación %, top 3 servicios.
