/** @jsx h */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ExecutionContext, InputId, Origin } from '../model';
import { Execution } from './Execution';
import { ChevronIcon } from './ChevronIcon';

export const InputEntry = ({ origin, input }: { origin: Origin; input: InputId }) => {
  const [expanded, setExpanded] = useState(false);
  const [executions, setExecutions] = useState<ExecutionContext<any>[] | null>(null);

  useEffect(() => {
    if (!expanded || executions !== null) return;

    const fetchExecutions = async () => {
      const { name, variant } = input;
      const res = await fetch(
        `/__inspector/api/origins/${origin.name}/input/${encodeURIComponent(
          name
        )}/${variant}/executions`
      );
      const data = await res.json();
      setExecutions(data);
    };

    fetchExecutions();
  }, [expanded]);

  const toggle = () => {
    setExpanded((exp) => !exp);
  };

  return (
    <div>
      <div class="expandable entry-container full-width card inverted" onClick={toggle}>
        <div class="entry" key={input.name}>
          <span class="tag">{input.type}</span>
          <span class="tag method">{input.variant}</span>
          {input.name}
        </div>
        <ChevronIcon expanded={expanded} />
      </div>
      <div class={'expandable-content' + (expanded ? '' : ' hidden')}>
        {executions ? (
          executions.length ? (
            <div class="list-block">
              {executions.map((ctx: ExecutionContext<any>) => (
                <Execution ctx={ctx} />
              ))}
            </div>
          ) : (
            <div class="list-block muted center italic">
              <div class="vp-8">No executions</div>
            </div>
          )
        ) : (
          'Loading...'
        )}
      </div>
    </div>
  );
};
