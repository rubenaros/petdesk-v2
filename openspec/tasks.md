# SDD Tasks — Stats Dashboard v6

## Task 1 — Implementar StatsEngine
- **Archivo**: `src/engine/stats.ts`
- **Criterio**: pasa tests unitarios con repo sembrado.

## Task 2 — Implementar API /api/stats
- **Archivo**: `src/app/api/stats/route.ts`
- **Criterio**: `curl /api/stats` devuelve JSON válido con default de 30 días.

## Task 3 — Añadir sección Estadísticas al dashboard
- **Archivo**: `src/app/dashboard/page.tsx`
- **Criterio**: se ven las 3 métricas + top 3 servicios; refresca cada 5s.

## Task 4 — Tests unitarios y edge cases
- **Archivos**: `tests/engine.test.ts`, `tests/engine.edge.test.ts`
- **Criterio**: `npm test` pasa (incluidos los nuevos tests).

## Task 5 — Verificación de calidad
- **Criterio**: `npm run lint` 0 errores, `npm run build` compila.

## Task 6 — Entrega
- Commit de código + artefactos SDD en `openspec/`.
- Push a `feat/v6-stats`.
- PR a `v6-baseline` con auto-merge.
