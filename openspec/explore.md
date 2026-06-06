# SDD Explore — Stats Dashboard (v6)

## Contexto
PetDesk v6 añade un dashboard de estadísticas para que el groomer vea métricas de su negocio: volumen de citas, tasas de cancelación/ocupación, y tops de servicios/clientes.

## Supuestos declarados
1. **Rango temporal**: el engine recibe `rangeStart` y `rangeEnd` como ISO strings; el análisis incluye citas cuyo `start` cae en `[rangeStart, rangeEnd)`.
2. **Horario laborable**: 9:00–18:00 UTC todos los días del rango (incluyendo fines de semana). Minutos laborables = días × 9h × 60 = días × 540.
3. **Ocupación**: solo citas con status `booked` o `completed` cuentan para ocupación. Canceladas no consumen tiempo.
4. **Tops**: máximo 5 elementos, ordenados desc por `count`, tie-break estable por `id` (asc alfabético).
5. **Precisión**: tasas con 4 decimales (redondeo estándar JS `toFixed(4)` → `Number`).
6. **Scope**: Dev Motor toca `src/engine/stats.ts` + `tests/engine.test.ts`; Dev Front toca `src/app/**` (ya existe dashboard).

## Decisiones de arquitectura
- StatsEngine es una clase pura que recibe `Repository` por constructor (igual que `Scheduler`).
- No se añade nuevo port; StatsEngine consume `Repository` directamente.
- La API reutiliza `getSharedInstances()` para acceder al repo singleton.
- El frontend hace polling cada 5s al endpoint `/api/stats`.

## Riesgos identificados
- **Rango vacío**: si no hay citas en el rango, todas las métricas deben ser 0 (no NaN/Infinity).
- **Empates en tops**: debe haber tie-break estable para tests deterministas.
- **Zona horaria**: todo en UTC (consistente con el resto del codebase).
