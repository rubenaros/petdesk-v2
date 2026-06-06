# SDD Spec — Stats Dashboard (v6)

## Requisitos funcionales

### R1 — StatsEngine.compute
**Dado** un `Repository` y un rango `[rangeStart, rangeEnd)`  
**Cuando** se llama `compute(rangeStart, rangeEnd)`  
**Entonces** devuelve `StatsBundle` con:

| Campo | Cálculo |
|---|---|
| `appointmentsTotal` | count de citas donde `start` ∈ [rangeStart, rangeEnd) |
| `appointmentsBooked` | count de citas en rango con `status === 'booked'` |
| `appointmentsCompleted` | count de citas en rango con `status === 'completed'` |
| `appointmentsCancelled` | count de citas en rango con `status === 'cancelled'` |
| `cancellationRate` | `cancelled / total` (0 si total=0), 4 decimales |
| `occupancyRate` | `durationMin de booked+completed / minutos laborables del rango` (0 si minutos=0), 4 decimales |
| `topServicesByBookings` | top 5 servicios por count de citas booked+completed, desc count, tie-break asc id |
| `topServicesByCancellations` | top 5 servicios por count de citas cancelled, desc count, tie-break asc id |
| `topClientsByVisits` | top 5 clientes por count de citas booked+completed, desc count, tie-break asc id |

**Invariante**: `booked + completed + cancelled === total` siempre.

### R2 — API GET /api/stats
**Dado** query params opcionales `start` e `end` (ISO strings)  
**Cuando** no se proporcionan, default = últimos 30 días  
**Entonces** devuelve `{ stats: StatsBundle }` con status 200.

### R3 — Dashboard Stats Section
**Dado** el panel de groomer  
**Cuando** carga la página  
**Entonces** muestra:
- Total de citas en el rango
- Porcentaje de cancelación
- Porcentaje de ocupación
- Top 3 servicios por reservas (nombre + count)

**Y** hace polling cada 5 segundos.

## Escenarios de edge case

### E1 — Rango vacío
- Rango sin citas → total=0, todas las tasas=0, tops=[]

### E2 — Todo cancelado
- Todas las citas en rango están cancelled → occupancyRate=0, cancellationRate=1

### E3 — Empates en tops
- Dos servicios con mismo count → ordenados por id ascendente

### E4 — Rango de un solo día
- Minutos laborables = 540 (9h)

### E5 — Rango que incluye fines de semana
- Se cuenta todos los días (incluyendo sábados y domingos) como laborables.
