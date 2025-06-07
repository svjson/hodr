import { StepMetadata, MetaJournalEntry, ExecutionContext } from '@hodr/core';

export { StepMetadata, MetaJournalEntry, ExecutionContext };

export type Origin = {
  name: string;
  type: string;
  inputs: [{ name: string; type: string; variant: string }];
};

export interface StepModel {
  name: string;
  type?: string;
  state: 'pending' | 'error' | 'finalized';
  input?: any;
  output?: any;
  metadata: StepMetadata;
  duration?: number | null;
  expansionState?: Record<string, any>;
  children: StepModel[];
}
