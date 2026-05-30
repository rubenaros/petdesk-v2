import type { Clock } from '../domain/ports';

export class MockClock implements Clock {
  private offset = 0; // hours
  
  now(): Date {
    const realNow = new Date();
    const advanced = new Date(realNow.getTime() + this.offset * 60 * 60 * 1000);
    return advanced;
  }
  
  advance(hours: number): void {
    this.offset += hours;
  }
  
  reset(): void {
    this.offset = 0;
  }
}