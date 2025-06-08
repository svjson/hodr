/** @jsx h */
import { h } from 'preact';
import { StepModel } from '../model';

const deselectAllSiblings = (nodeLmnt: HTMLElement) => {
  nodeLmnt
    .closest('.tree-container')!
    .querySelectorAll('.step-header')
    .forEach((label) => label.classList.remove('selected'));
};

export const StepTree = ({
  step,
  depth = 0,
  onSelect,
}: {
  step: StepModel;
  depth?: number;
  onSelect: (step: StepModel) => void;
}) => {
  const toggle = (nodeLmnt: HTMLElement, step: StepModel) => {
    deselectAllSiblings(nodeLmnt);
    nodeLmnt.closest('.step-header')!.classList.add('selected');

    onSelect(step);
  };

  return (
    <div class={`step-row status-${step.state}`} style={`--depth: ${depth}`}>
      <div
        class="step-header entry-container"
        onClick={(e: MouseEvent) => toggle(e.currentTarget as HTMLElement, step)}
      >
        <div class={`entry tree-node status-${step.state}`}>
          <span class="tree-node-icon">{step.children?.length ? '▶' : '•'}</span>{' '}
          <span class="step-label">{step.name}</span>{' '}
        </div>
        <div class="entry right step-duration">
          {step.duration === null ? (
            <span class="step-duration muted">-</span>
          ) : (
            <span class="step-duration">({step.duration}ms)</span>
          )}
        </div>
      </div>

      {step.children?.length > 0 && (
        <div class="step-children">
          {step.children.map((child) => (
            <StepTree step={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};
