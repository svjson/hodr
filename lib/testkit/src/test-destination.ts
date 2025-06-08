import { makeHodr, memoryTracker, HodrRouter, Hodr } from '@hodr/core';
import { FakeHttpClientResponses, makeFakeHttpClientPlugin } from './fake-http-client';

export const setupTestDestination = (
  params: FakeHttpClientResponses
): { router: HodrRouter; hodr: Hodr } => {
  const hodr = makeHodr();
  hodr.use(memoryTracker({ limit: 10 }));

  const router = hodr.router('test-router');

  hodr
    .destination('test-destination')
    .httpClient({ adapter: makeFakeHttpClientPlugin(params) });

  return { router, hodr };
};
