import { ExecutionContext } from '../context';
import { Tracker } from './types';

export type MemoryTrackerConfig = { name?: string; limit?: number };

/**
 * This Tracker implementation stacks execution contexts in memory like a game of Jenga.
 *
 * The circular fifo storage promised in the interface is still very much on the to-do list,
 * so don't leave it running and forget about it while you're off to the beach.
 */
class MemoryTracker implements Tracker {
  __type: 'tracker' = 'tracker';
  name: string;
  limit: number;
  contexts: ExecutionContext<any>[] = [];

  constructor(config: MemoryTrackerConfig) {
    this.name = config.name ?? 'memory-tracker';
    this.limit = config.limit || 100;
  }

  getRecorded(): ExecutionContext<any>[] {
    return this.contexts;
  }

  record(ctx: ExecutionContext<any>): void {
    this.contexts.push(ctx);
  }
}

/**
 * Factory-method for MemoryTracker
 */
export const memoryTracker = (config: MemoryTrackerConfig): Tracker => {
  return new MemoryTracker({
    name: config.name ?? 'memory-tracker',
    ...config,
  });
};
