import { Recorder } from './engine';
import { Destination, DestinationBuilder, Origin } from './lane';
import { HodrDestinationBuilder } from './lane/builder';
import { HodrDestination } from './lane/destination';
import { HodrRouter } from './router';
import { DefaultHodrRouter } from './router/router';
import type { Hodr as HodrInterface } from './types';

class Hodr implements HodrInterface {
  origins: Record<string, Origin> = {};
  services: Record<string, Destination> = {};
  recorders: Record<string, Recorder> = {};

  router(name: string): HodrRouter {
    const router = new DefaultHodrRouter(() => this, name);
    this.origins[name] = router;
    return router;
  }

  service(name: string): DestinationBuilder {
    const service = new HodrDestination(() => this, name);
    this.services[name] = service;
    return new HodrDestinationBuilder(() => this, service);
  }

  useRecorder(recorder: Recorder): Hodr {
    this.recorders[recorder.name] = recorder;
    return this;
  }
}

export function makeHodr() {
  return new Hodr();
}
