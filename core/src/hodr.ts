import { Recorder, Validator } from './engine';
import { Destination, DestinationBuilder, Origin, Usable } from './lane';
import { HodrDestinationBuilder } from './lane/builder';
import { HodrDestination } from './lane/destination';
import { HodrRouter } from './router';
import { DefaultHodrRouter } from './router/router';
import type { Hodr as HodrInterface } from './types';

class Hodr implements HodrInterface {
  origins: Record<string, Origin> = {};
  services: Record<string, Destination> = {};
  recorders: Record<string, Recorder> = {};
  validators: Validator[] = [];

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

  use(feature: Usable): Hodr {
    switch (feature.__type) {
      case 'validator':
        this.validators.push(feature as Validator);
        break;
    }
    return this;
  }

  useValidator(validator: Validator): Hodr {
    this.validators.push(validator);
    return this;
  }

  useRecorder(recorder: Recorder): Hodr {
    this.recorders[recorder.name] = recorder;
    return this;
  }
}

export function makeHodr() {
  return new Hodr();
}
