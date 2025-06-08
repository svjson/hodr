/** @jsx h */
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { StepTree } from './StepTree';
import { ExecutionStepPanel, displayStepDetails } from './ExecutionStepPanel';
import { StepModel } from '../model.ts';
import { getExpansionState } from '../lib/pretty-json-state.ts';

export const ExecutionPanel = (props: { ctx: any; executionModel: any }) => {
  const { executionModel } = props;
  const stepContainerRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<StepModel | null>(null);

  const onSelectStep = (step: StepModel) => {
    if (currentStepRef.current) {
      currentStepRef.current.expansionState = currentStepRef.current.expansionState || {};
      stepContainerRef.current!.querySelectorAll('pretty-json').forEach((lmnt) => {
        currentStepRef.current!.expansionState![
          lmnt.closest('.payload-panel')!.getAttribute('data-id')!
        ] = getExpansionState(lmnt as HTMLElement);
      });
    }

    displayStepDetails(stepContainerRef.current!, step);
    currentStepRef.current = step;
    console.log(JSON.stringify(step.input, null, 2));
  };

  useEffect(() => {
    // Select the first actual step (excluding initial/finalize if needed)
    const firstStep = executionModel.steps[0];
    const stepNode = stepContainerRef.current!.querySelector('.step-header') as HTMLElement;
    if (firstStep && stepNode) {
      stepNode.classList.add('selected');
      onSelectStep(firstStep);
    }
  }, []);

  const initialTransportStatus =
    executionModel.steps[1].state === 'pending' ? 'pending' : executionModel.steps[0].state;

  const finalizeTransportStatus = executionModel.steps[executionModel.steps.length - 2].state;

  return (
    <div class="steps-container columns" ref={stepContainerRef}>
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
