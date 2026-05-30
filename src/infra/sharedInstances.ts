import { InMemoryRepo } from './memoryRepo';
import { MockClock } from './mockClock';
import { Scheduler } from '../engine/scheduler';
import { InAppNotifier } from './inAppNotifier';

// Shared instances for the demo
let sharedRepo: InMemoryRepo | null = null;
let sharedClock: MockClock | null = null;
let sharedScheduler: Scheduler | null = null;
let sharedNotifier: InAppNotifier | null = null;

export function getSharedInstances() {
  if (!sharedRepo) sharedRepo = new InMemoryRepo(true);
  if (!sharedClock) sharedClock = new MockClock();
  if (!sharedScheduler) sharedScheduler = new Scheduler(sharedRepo, sharedClock);
  if (!sharedNotifier) sharedNotifier = new InAppNotifier();

  return {
    repo: sharedRepo,
    clock: sharedClock,
    scheduler: sharedScheduler,
    notifier: sharedNotifier,
  };
}