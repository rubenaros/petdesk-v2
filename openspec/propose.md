# SDD Proposal — Stats Dashboard v6

## Intent
Añadir un dashboard de estadísticas operativas al panel del groomer, calculado sobre citas en un rango temporal.

## Scope
- `src/engine/stats.ts` — `StatsEngine` con método `compute(rangeStart, rangeEnd): StatsBundle`
- `src/app/api/stats/route.ts` — endpoint GET con `?start` y `?end` (default últimos 30 días)
- `src/app/dashboard/page.tsx` — sección "Estadísticas" con métricas clave y polling cada 5s
- `tests/engine.test.ts` — tests unitarios y de contrato del engine
- `tests/engine.edge.test.ts` — casos límite (rango vacío, todo cancelado, empates)

## Out of scope
- Persistencia real (se mantiene InMemoryRepo).
- Filtros por servicio o cliente en la API.
- Exportar a CSV/Excel.

## Approach
Motor puro que itera `listAppointments()` una sola vez, acumula contadores y construye los tops. La API reutiliza `getSharedInstances()`. El UI hace `fetch('/api/stats')` con `setInterval(5000)`.

## Budget
~400 líneas totales (código + tests + SDD).
