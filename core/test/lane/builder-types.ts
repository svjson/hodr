import type { GenericLaneBuilder, HttpResponseLaneBuilder } from '../../src/lane/builder';

/** --- Type utility --- */

type Assert<T, Expected> = T extends Expected
  ? Expected extends T
    ? true
    : never
  : never;

/* --- Type guards for sanity checks --- */
type NamedThing = { name: string };

declare const chain: GenericLaneBuilder<NamedThing>;

const r1 = chain
  .transform((thing) => thing.name)
  .httpGet('users', '/:id')
  .expectHttpOk()
  .transform((res) => ({ profile: res.body }))
  .expectValue('internal-error');

/** Type assertions */
type R1 = typeof r1;
type ExpectedR1 = GenericLaneBuilder<{ profile: any }>;

type Test1 = Assert<R1, ExpectedR1>;

// --- You can also isolate and test intermediate steps ---

const afterHttp = chain.httpGet('users', '/:id').expectHttpStatus(200);

type StepType = typeof afterHttp;
// Hover here to confirm: HttpResponseLaneBuilder<HttpResponse, GenericLaneBuilder<...>>
