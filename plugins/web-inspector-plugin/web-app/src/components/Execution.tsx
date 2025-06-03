/** @jsx h */
import { h } from 'nano-jsx';
import { toggleExpandable } from './Expandable';
import { formatDate, juxt } from '../util';
import { ExecutionPanel } from './ExecutionPanel';
import { StepModel } from '../model.ts';

const STATUS_ICONS = {
  pending: '⏳',
  finalized: '✅',
  error: '❌',
};

const buildStepModel = (step: any): StepModel => {
  return {
    name: step.name,
    type: step.type,
    input: step.input,
    output: step.output,
    metadata: step.metadata ?? {
      input: {},
      journal: [],
      output: {},
    },
    state: step.state ?? 'pending',
    duration: step.finishedAt ? step.finishedAt - step.startedAt : null,
    children: [],
  };
};

const buildExecutionModel = (ctx: any) => {
  const model = {
    steps: [
      buildStepModel(ctx.initialStep),
      ...juxt<any, any>(ctx.lane.steps, ctx.steps).map(([plan, step]) => {
        return buildStepModel(step ?? plan);
      }),
      buildStepModel(ctx.finalizeStep),
    ],
  };

  return model;
};

export const Execution = (props: { ctx: any }) => {
  const { ctx } = props;

  const executionModel = buildExecutionModel(ctx);

  const startedAt = ctx.steps.length !== 0 ? formatDate(ctx.steps[0].startedAt) : '';
  const success = ctx.state === 'finalized';

  const toggle = (lmnt: HTMLElement) => {
    const content = toggleExpandable(lmnt)!;
    if (!content.querySelector('.step-header.selected')) {
      const first = content.querySelector('.step-header') as HTMLElement;
      if (first) first.click();
    }
  };

  return (
    <div>
      <div
        class="list-row expandable"
        onClick={(e: MouseEvent) => toggle(e.currentTarget as HTMLElement)}
      >
        <div class="entry-container full-width">
          <div class="entry">
            <span class="tag">{startedAt}</span>
            <span>{ctx.inputTopic}</span>
          </div>
          <div class="entry">
            <span class="hm-8">
              <span class="muted">Steps completed: </span>
              {ctx.steps.length} / {ctx.lane.steps.length}
            </span>
            <span class={success ? 'success hm-8' : 'error hm-8'}>{ctx.outputTopic}</span>
            <span>{STATUS_ICONS[ctx.state]}</span>
            <span class="chevron-icon down">⮟</span>
          </div>
        </div>
      </div>
      <div class="expandable-content hidden">
        <ExecutionPanel ctx={ctx} executionModel={executionModel} />
      </div>
    </div>
  );
};
