# SDD Design — Stats Dashboard v6

## Arquitectura

```
┌─────────────────┐     GET /api/stats     ┌──────────────┐
│  Dashboard UI   │ ◄───────────────────── │  API Route   │
│  (polling 5s)   │                        │  /api/stats  │
└─────────────────┘                        └──────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │  StatsEngine  │
                                          │  compute()    │
                                          └───────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │  Repository   │
                                          │  (InMemory)   │
                                          └───────────────┘
```

## StatsEngine

- **Input**: `Repository`, `rangeStart: Date`, `rangeEnd: Date`
- **Output**: `StatsBundle`
- **Algoritmo**:
  1. Filtrar citas donde `start ∈ [rangeStart, rangeEnd)`.
  2. En una sola pasada, acumular:
     - contadores por status (total, booked, completed, cancelled)
     - map `serviceId → bookings` (booked + completed)
     - map `serviceId → cancellations`
     - map `clientId → visits` (booked + completed)
     - suma de `durationMin` para citas no canceladas (usando `repo.getService`)
  3. Calcular minutos laborables: iterar días en el rango, intersectar `[09:00, 18:00)` con el rango, sumar minutos.
  4. Calcular tasas con `Math.round(value * 10000) / 10000`.
  5. Ordenar tops: `sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))`, tomar primeros 5.
  6. Mapear a `ServiceCount` / `ClientCount` con los field names correctos del contrato.

## API Route

- Usa `getSharedInstances()` para obtener el repo singleton.
- Parsea `start`/`end` de `URL.searchParams`.
- Default: `new Date(now - 30d)` y `new Date(now)`.
- Instancia `StatsEngine` por request (stateless, barato).
- Devuelve `NextResponse.json({ stats })`.

## Dashboard

- Nuevo estado `stats` + `statsLoading`.
- `useEffect` con `fetch('/api/stats')` al montar.
- `setInterval(fetchStats, 5000)`; cleanup en unmount.
- Render: grid de 3 tarjetas (total, cancelación %, ocupación %) + lista top 3 servicios.
- Reutiliza `getServiceName` existente para mostrar nombres legibles.

## Tests

- **Unitarios**: `StatsEngine` con repo sembrado manualmente, verificando cada métrica.
- **Edge cases**: rango vacío, todo cancelado, empates, rango parcial.
- **E2E**: API route con `InMemoryRepo` (usando `GET` simulado o test de integración ligero).
