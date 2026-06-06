# SDD Spec — Stats Dashboard v6

## Requisitos funcionales

### R1 — StatsEngine.compute
- **Dado** un `Repository` y un rango `[rangeStart, rangeEnd)`
- **Cuando** se invoca `compute`
- **Entonces** devuelve `StatsBundle` con:
  - `appointmentsTotal`: citas cuyo `start` cae en el rango (cualquier status).
  - `appointmentsBooked` / `appointmentsCompleted` / `appointmentsCancelled`: conteo por status; la suma == total.
  - `cancellationRate`: `cancelled / total` redondeado a 4 decimales; `0` si `total == 0`.
  - `occupancyRate`: `sum(durationMin de booked + completed) / minutos_laborables_del_rango` redondeado a 4 decimales; `0` si minutos laborables == 0.
  - `topServicesByBookings`: top 5 servicios por número de citas booked+completed, orden desc, tie-break por `serviceId` ascendente.
  - `topServicesByCancellations`: top 5 servicios por número de citas cancelled, orden desc, tie-break por `serviceId` ascendente.
  - `topClientsByVisits`: top 5 clientes por número de citas booked+completed, orden desc, tie-break por `clientId` ascendente.

### R2 — API GET /api/stats
- **Dado** una petición GET
- **Cuando** no hay query params `start`/`end`
- **Entonces** usa como default el rango `[ahora - 30 días, ahora)`.
- **Cuando** hay query params
- **Entonces** los parsea como ISO 8601 y los pasa al `StatsEngine`.
- **Entonces** devuelve JSON `{ stats: StatsBundle }`.

### R3 — Dashboard UI
- **Dado** el panel del groomer
- **Cuando** carga la página
- **Entonces** muestra una sección "Estadísticas" con:
  - Total de citas en el rango.
  - Tasa de cancelación (%).
  - Tasa de ocupación (%).
  - Top 3 servicios por reservas (nombre + count).
- **Y** hace polling cada 5 segundos para refrescar los datos.

## Escenarios de edge case

### E1 — Rango vacío
- Rango que no contiene ninguna cita.
- Resultado: total=0, todas las tasas=0, tops=[]

### E2 — Todo cancelado
- Todas las citas en el rango tienen status cancelled.
- Resultado: cancellationRate=1, occupancyRate=0, topServicesByBookings=[]

### E3 — Empates en tops
- Dos servicios con el mismo count.
- Resultado: orden estable por serviceId (localeCompare).

### E4 — Rango parcial de día laborable
- Rango `[10:00, 14:00)` de un día laborable.
- Resultado: minutos laborables = 240 (4h × 60min).
