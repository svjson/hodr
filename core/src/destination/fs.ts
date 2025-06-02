import { HodrContext } from '../context';
import { DestinationAdapter } from '../engine';

/**
 * DestinationAdapter for serving static content from the file system.
 *
 * The basic idea was initially to treat fetching static content from disk
 * as "any old" Destination - which makes sense at first glance.
 *
 * However, this is something that both Koa and express - and probably every
 * other nodejs http layer ever thought up since the ancient greeks first
 * started thinking about the web - have built-in support for.
 *
 * It makes zero sense to re-implement whatever fetching/caching and
 * mime-resolution scheme these packages use. That wheel has been rolling
 * perfectly fine for a long time, and a new-fangled and half-baked Hodr-wheel
 * isn't going to out-roll it.
 *
 * What we need is an abstraction that works both logically for poor human
 * minds and in the psychedelic implementation-agnostic outer plane of Hodr.
 *
 * So, for now we're passing back a type hint and letting the only actual
 * implentation - Koa - watch out for it. And then there was a silence in
 * heaven for about half an hour.
 */
export class FileSystemDestinationAdapter implements DestinationAdapter {
  constructor(readonly root: string) {}

  async invoke(ctx: HodrContext<string>, path: string): Promise<any> {
    ctx.metadata.payloadTypeHint = 'static-content';
    return [this.root, ctx.payload].join('/');
  }
}
