import { ExecutionContext } from '../context';
import { DestinationAdapter } from '../engine';
import { Hodr } from '../types';
import { Destination, Lane } from './types';

export class HodrDestination<T = unknown, Params = unknown> implements Destination<T> {
  adapter?: DestinationAdapter;
  targets: Record<string, Target> = {};

  constructor(
    readonly root: () => Hodr,
    readonly name: string
  ) {}

  async invoke(ctx: ExecutionContext<T>, path: string, params: Params): Promise<any> {
    if (this.adapter) {
      return await this.adapter.invoke(ctx, path, params);
    }
  }

  createTarget(name: string): Target {
    const target = new Target(this.root, this, name, { root: this.root, steps: [] });
    this.targets[name] = target;
    return target;
  }
}

export class Target {
  constructor(
    readonly root: () => Hodr,
    readonly destination: Destination,
    readonly name: string,
    public lane: Lane
  ) {}
}
