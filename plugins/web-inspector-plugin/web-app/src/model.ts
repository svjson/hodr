import { StepMetadata } from '@hodr/core';

export { StepMetadata };

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
  children: StepModel[];
}
