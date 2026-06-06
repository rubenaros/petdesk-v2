# SDD Explore — Stats Dashboard v6

## Contexto
El contrato `StatsBundle` ya existe en `src/domain/types.ts` (v3 stats dashboard). Falta la implementación del motor de cálculo, la API expuesta y la sección UI en el dashboard del groomer.

## Supuestos
- El repositorio es `InMemoryRepo` (síncrono). StatsEngine recibe `Repository` por constructor.
- El rango de análisis es `[rangeStart, rangeEnd)` en UTC.
- Horario laborable: 09:00–18:00 UTC todos los días.
- occupancyRate = minutos de citas no canceladas / minutos laborables en el rango.
- cancellationRate = cancelled / total (4 decimales).
- Tops: máximo 5, orden desc por count, tie-break estable por id (localeCompare).

## Riesgos identificados
- Cálculo de minutos laborables con rangos parciales (empiezan o terminan a mitad de día).
- Empates en tops: debe ser determinista.
- Rango vacío: todos los contadores en 0, tasas en 0.

## Decisión
Implementar `StatsEngine` puro (sin side effects), API GET `/api/stats` con query params, y sección en dashboard con fetch + polling cada 5s.
