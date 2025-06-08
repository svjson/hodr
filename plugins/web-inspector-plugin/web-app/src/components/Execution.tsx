/** @jsx h */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { formatDate, juxt } from '../util';
import { ExecutionPanel } from './ExecutionPanel';
import { ExecutionContext, StepModel } from '../model.ts';
import { ChevronIcon } from './ChevronIcon.tsx';

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

export const Execution = ({ ctx }: { ctx: ExecutionContext<any> }) => {
  const [expanded, setExpanded] = useState(false);

  const executionModel = buildExecutionModel(ctx);

  const startedAt = ctx.steps.length !== 0 ? formatDate(ctx.steps[0].startedAt) : '';
  const success = ctx.state === 'finalized';

  return (
    <div>
      <div class="list-row expandable" onClick={() => setExpanded(!expanded)}>
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
            <ChevronIcon expanded={expanded} />
          </div>
        </div>
      </div>
      <div class={'expandable-content' + (expanded ? '' : ' hidden')}>
        <ExecutionPanel ctx={ctx} executionModel={executionModel} />
      </div>
    </div>
  );
};
