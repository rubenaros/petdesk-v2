# SDD Design — Stats Dashboard (v6)

## Componentes

### StatsEngine (`src/engine/stats.ts`)
```typescript
class StatsEngine {
  constructor(private repo: Repository) {}
  compute(rangeStart: string, rangeEnd: string): StatsBundle
}
```
- Lee `repo.listAppointments()` y `repo.listServices()`.
- Filtra citas por rango (incl. start, excl. end).
- Agrupa por servicio/cliente para tops.
- Calcula minutos laborables: días entre start y end (sin contar end) × 540.

### API Route (`src/app/api/stats/route.ts`)
- Parsea `start` y `end` de query params.
- Defaults: `end = now`, `start = now - 30 días`.
- Usa `getSharedInstances().repo` para construir `StatsEngine`.
- Devuelve JSON `{ stats }`.

### Dashboard (`src/app/dashboard/page.tsx`)
- Añade estado `stats` + `useEffect` con `setInterval(5000)`.
- Nuevo fetch a `/api/stats`.
- Sección visual con cards para métricas clave.

## Algoritmos clave

### Filtrado por rango
```typescript
const inRange = (appt: Appointment) =>
  appt.start >= rangeStart && appt.start < rangeEnd;
```

### Minutos laborables
```typescript
const start = new Date(rangeStart);
const end = new Date(rangeEnd);
const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
const workMinutes = days * 9 * 60; // 9h/día
```

### Top N con tie-break
```typescript
function topN<T extends { id: string }>(
  items: T[],
  key: (x: T) => number,
  n: number
): T[] {
  return items
    .sort((a, b) => key(b) - key(a) || a.id.localeCompare(b.id))
    .slice(0, n);
}
```

## Testing strategy
- Unit: StatsEngine con repo sembrado manualmente.
- Edge: rango vacío, todo cancelado, empates.
- E2E: API route con request real (Vitest + jsdom no cubre fetch de Next; usamos test unitario del engine).
