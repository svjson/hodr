import { Recorder } from './engine';
import { Destination, DestinationBuilder, Origin } from './lane';
import { HodrRouter } from './router';

/*
 * The base Hodr object for interaction and configuration in client code.
 *
 * Keeps a registry of services/targets that can be invoked.
 *
 * FIXME: Because of the registry nature of this central but - once configured -
 * fairly hidden type, it is somewhat of a coupling magnet.
 * Consider hiding the non-public configuration members to the implementation
 * and/or putting the runtime-lookup behind some kind of registry interface and
 * let the Hodr-interface stay out of sight after app-configuration is done.
 */
export interface Hodr {
  origins: Record<string, Origin>;
  services: Record<string, Destination>;
  recorders: Record<string, Recorder>;

  service(name: string): DestinationBuilder;
  router(name: string): HodrRouter;
  use(plugin: HodrPlugin): void;

  useRecorder(recorder: Recorder): Hodr;
}

/*
 * Plugin interfaces (ON HOLD)
 *
 * The idea was that a Plugin would describe the extensions they provide
 * and let Hodr.use() apply them to the correct mount points but we might
 * end up with a more modular approach on the basic language level, so
 * might not even be needed.
 */
export interface HodrPlugin {
  extensions: HodrPluginExtension[];
}

export interface HodrPluginExtension {
  type: 'service';
}
