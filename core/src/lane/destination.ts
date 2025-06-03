import { ExecutionContext } from '../context';
import { DestinationAdapter } from '../engine';
import { Hodr } from '../types';
import { Destination } from './types';

export class HodrDestination<T = unknown> implements Destination<T> {
  adapter?: DestinationAdapter;

  constructor(
    readonly root: () => Hodr,
    readonly name?: string
  ) {}

  async invoke(ctx: ExecutionContext<T>, path: string): Promise<any> {
    if (this.adapter) {
      return await this.adapter.invoke(ctx, path);
    }
  }
}
