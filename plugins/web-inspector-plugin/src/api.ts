import type { Hodr, HodrRouter } from '@hodr/core';
import path from 'path';

export function makeHodrWebInspector(hodr: Hodr): HodrRouter[] {
  hodr.destination('__inspector/static').fileSystem(path.resolve(__dirname, 'static'));

  const api = hodr.router('__inspector');

  api
    .get('/__inspector/static/:path*')
    .extract('params.path')
    .invokeDestination('__inspector/static', ':path');

  api.get('/__inspector/api/origins').transform(async (_) => {
    return Object.values(hodr.origins)
      .filter((o) => o.name !== '__inspector')
      .map((o) => {
        return {
          name: o.name,
          type: o.type,
          inputs: o.inputs().map((i) => {
            return {
              name: i.name,
              type: i.type,
              variant: i.variant(),
            };
          }),
        };
      });
  });

  api
    .get('/__inspector/api/origins/:origin/input/:input/:variant/executions')
    .transform(async (ctx) => {
      const input = decodeURIComponent(ctx.payload.params?.input as string);
      return hodr.trackers['memory-tracker']
        .getRecorded()
        .filter(
          (recCtx) =>
            recCtx.origin.name === ctx.payload.params?.origin &&
            recCtx.origin.input === input &&
            recCtx.origin.variant === ctx.payload.params?.variant
        );
    });

  api.get('/__inspector/api/inputs/executions/').transform(async (_) => {
    return hodr.trackers['memory-tracker']
      .getRecorded()
      .filter((ctx) => ctx.origin.name !== '__inspector');
  });

  return [api];
}
