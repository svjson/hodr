import { HodrContext } from '../context';
import { DestinationAdapter } from '../engine';
import { Hodr } from '../types';
import { Destination } from './types';

export class HodrDestination implements Destination {
  adapter?: DestinationAdapter;

  constructor(
    readonly root: () => Hodr,
    readonly name?: string
  ) {}

  async invoke(ctx: HodrContext, path: string): Promise<any> {
    if (this.adapter) {
      return await this.adapter.invoke(ctx, path);
    }
  }
}
