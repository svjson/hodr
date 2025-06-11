import { HodrContext } from '../src/context/context';
import { Hodr } from '../src/types';

export const makeDummyContext = <Payload>(params: any) => {
  return new HodrContext<Payload>({
    origin: params.origin ?? {
      name: 'sharks',
      input: 'batteries',
      variant: 'tanks',
    },
    lane: params.lane ?? {
      root: function (): Hodr {
        throw new Error('Function not implemented.');
      },
      steps: [],
    },
    payload: params.payload,
    initialStep: params.initialStep ?? {
      type: 'initial',
      name: '',
      state: 'finalized',
      input: undefined,
      metadata: {
        input: {},
        output: {},
        journal: [],
      },
      startedAt: 0,
      forks: [],
    },
    currentStep: params.currentStep ?? {
      name: '',
      state: 'pending',
      input: undefined,
      metadata: {
        input: {},
        output: {},
        journal: [],
      },
      startedAt: 0,
      forks: [],
    },
    finalizeStep: params.finalizeStep ?? null,
    metadata: params.metadata ?? {},
    inputTopic: params.inputTopic ?? 'things',
  });
};
