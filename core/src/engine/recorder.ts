import { ExecutionContext } from '../context';
import { Recorder } from './types';

export type MemoryRecorderConfig = { name?: string; limit?: number };

/**
 * This Recorder implementation stacks execution contexts in memory like a game of Jenga.
 *
 * The circular fifo storage promised in the interface is still very much on the to-do list,
 * so don't leave it running and forget about it while you're off to the beach.
 */
class MemoryRecorder implements Recorder {
  name: string;
  limit: number;
  contexts: ExecutionContext<any>[] = [];

  constructor(config: MemoryRecorderConfig) {
    this.name = config.name ?? 'memory-recorder';
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
 * Factory-method for MemoryRecorder
 */
export const memoryRecorder = (config: MemoryRecorderConfig): Recorder => {
  return new MemoryRecorder({
    name: config.name ?? 'memory-recorder',
    ...config,
  });
};
