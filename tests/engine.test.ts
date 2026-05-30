import { describe } from 'vitest';
import { Scheduler } from '../src/engine/scheduler';
import { InMemoryRepo } from '../src/infra/memoryRepo';
import { SystemClock } from '../src/infra/systemClock';
import { schedulerPortContract } from './contracts/SchedulerPort.contract';

describe('Scheduler', () => {
  schedulerPortContract(() => {
    const repo = new InMemoryRepo();
    return { scheduler: new Scheduler(repo, new SystemClock()), repo, clock: new SystemClock() };
  });
});
