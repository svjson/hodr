import { ExecutionContext } from './context';
import { Tracker, Validator } from './engine';
import { Destination, DestinationBuilder, ModuleOrigin, Origin, Usable } from './lane';
import { HodrDestinationBuilder, GenericLaneBuilder } from './lane';
import { HodrDestination } from './lane/destination';
import { HodrRouter } from './router';
import { DefaultHodrRouter } from './router/router';
import type { Hodr as HodrInterface, HodrOptions } from './types';

class Hodr implements HodrInterface {
  appId: string;
  appName: string;

  origins: Record<string, Origin> = {};
  destinations: Record<string, Destination> = {};
  trackers: Record<string, Tracker> = {};
  validators: Validator[] = [];

  constructor(opts?: HodrOptions) {
    this.appId = opts?.appId ?? 'hodr-app';
    this.appName = opts?.appName ?? 'Hodr Application';
  }

  module(name: string): ModuleOrigin {
    if (this.origins[name]) {
      return this.origins[name] as ModuleOrigin;
    }
    const moduleOrigin = new ModuleOrigin(() => this, name);
    this.origins[name] = moduleOrigin;
    return moduleOrigin;
  }

  function<Payload = any>(name: string): GenericLaneBuilder<Payload> {
    return this.module(`${name}-module`).function(name);
  }

  router(name: string): HodrRouter {
    const router = new DefaultHodrRouter(() => this, name);
    this.origins[name] = router;
    return router;
  }

  destination(name: string): DestinationBuilder {
    const destination = new HodrDestination(() => this, name);
    this.destinations[name] = destination;
    return new HodrDestinationBuilder(() => this, destination);
  }

  use(feature: Usable): Hodr {
    switch (feature.__type) {
      case 'tracker':
        this.trackers[(feature as Tracker).name] = feature as Tracker;
        break;
      case 'validator':
        this.validators.push(feature as Validator);
        break;
    }
    return this;
  }

  record(ctx: ExecutionContext<any>) {
    Object.values(this.trackers).forEach((tracker) => {
      tracker.record(ctx);
    });
  }
}

export function makeHodr(opts?: HodrOptions) {
  return new Hodr(opts);
}
