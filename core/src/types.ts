import { ExecutionContext } from './context';
import { Tracker, Validator } from './engine';
import { Destination, DestinationBuilder, ModuleOrigin, Origin, Usable } from './lane';
import { GenericLaneBuilder } from './lane/builder';
import { HodrRouter } from './router';

/*
 * The base Hodr object for interaction and configuration in client code.
 *
 * Keeps a registry of destinations/targets that can be invoked.
 *
 * FIXME: Because of the registry nature of this central but - once configured -
 * fairly hidden type, it is somewhat of a coupling magnet.
 * Consider hiding the non-public configuration members to the implementation
 * and/or putting the runtime-lookup behind some kind of registry interface and
 * let the Hodr-interface stay out of sight after app-configuration is done.
 */
export interface Hodr {
  appId: string;
  appName: string;

  origins: Record<string, Origin>;
  trackers: Record<string, Tracker>;
  destinations: Record<string, Destination>;
  validators: Validator[];

  module(name: string): ModuleOrigin;
  function(name: string): GenericLaneBuilder;
  destination(name: string): DestinationBuilder;
  router(name: string): HodrRouter;

  use(feature: Usable): Hodr;

  record(ctx: ExecutionContext<any>): void;
}

export interface HodrOptions {
  appId?: string;
  appName?: string;
}
