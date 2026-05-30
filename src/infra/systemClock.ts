import type { Clock } from '../domain/ports';

// Reloj real. En tests se usa un Clock manual con una fecha fija.
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
