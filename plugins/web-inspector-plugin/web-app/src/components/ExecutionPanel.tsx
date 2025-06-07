/** @jsx h */
import { h } from 'nano-jsx';
import { StepTree } from './StepTree';
import {
  ExecutionStepPanel,
  displayStepDetails,
  getExpansionState,
} from './ExecutionStepPanel';
import { StepModel } from '../model.ts';

export const ExecutionPanel = (props: { ctx: any; executionModel: any }) => {
  const { executionModel } = props;

  let currentStep: StepModel | null = null;

  const onSelectStep = (stepNode: HTMLElement, step: StepModel) => {
    const stepContainer = stepNode.closest('.steps-container')! as HTMLElement;

    if (currentStep) {
      currentStep.expansionState = currentStep.expansionState || {};
      stepContainer.querySelectorAll('pretty-json').forEach((lmnt) => {
        currentStep!.expansionState![
          lmnt.closest('.payload-panel')!.getAttribute('data-id')!
        ] = getExpansionState(lmnt as HTMLElement);
      });
    }

    displayStepDetails(stepContainer, step);
    currentStep = step;
  };

  const initialTransportStatus =
    executionModel.steps[1].state === 'pending' ? 'pending' : executionModel.steps[0].state;

  const finalizeTransportStatus = executionModel.steps[executionModel.steps.length - 2].state;

  return (
    <div class="steps-container columns">
      <div class="column tree-column">
        <div>
          <h3>Steps</h3>
        </div>
        <div class="card inverted tree-container">
          {executionModel.steps.map((step: StepModel) => (
            <div>
              {step.type === 'finalize' && (
                <div class={`step-row node-padding status-${finalizeTransportStatus}`}></div>
              )}
              <StepTree step={step} depth={0} onSelect={onSelectStep} />
              {step.type === 'initial' && (
                <div class={`step-row node-padding status-${initialTransportStatus}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div class="column full-width">
        <ExecutionStepPanel />
      </div>
    </div>
  );
};
