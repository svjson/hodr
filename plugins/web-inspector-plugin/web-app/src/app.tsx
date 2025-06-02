/** @jsx h */
import { h, render } from 'nano-jsx';
import 'pretty-json-custom-element';

import { Execution } from './components/Execution';
import { toggleExpandable } from './components/Expandable';
import './components/Collapsible';
import { Origin, HodrContext } from './model';

const App = () => {
  const el = (
    <div class="container">
      <h1>
        <code>Hodr Inspector</code>
      </h1>
      <div>
        <div id="lane-list">Loading lanes...</div>
      </div>
    </div>
  );

  const ITEM_TYPES = {
    input: {
      uri: (item) =>
        `origins/${item.origin}/input/${encodeURIComponent(item.input)}/${item.variant}/executions`,

      renderList: (items) => (
        <div class="list-block">
          {items.map((ctx: HodrContext) => (
            <Execution ctx={ctx} />
          ))}
        </div>
      ),
    },
  };

  const subscribe = (type: string, item, content: HTMLElement) => {
    queueMicrotask(async () => {
      const itemType = ITEM_TYPES[type];

      const res = await fetch(`/__inspector/api/${itemType.uri(item)}`);
      const data = await res.json();

      content.replaceChildren(
        data.length ? (
          itemType.renderList.call(itemType, data)
        ) : (
          <div class="list-block muted center italic">
            <div class="vp-8">No executions</div>
          </div>
        )
      );
    });
  };

  const toggleInput = (lmnt: HTMLElement, origin: Origin, input) => {
    const content = toggleExpandable(lmnt);
    subscribe(
      'input',
      { origin: origin.name, input: input.name, variant: input.variant },
      content!
    );
  };

  queueMicrotask(async () => {
    const res = await fetch('/__inspector/api/origins');
    const data = await res.json();

    const list = (
      <div>
        {data.map((origin: Origin) => (
          <div class="card">
            <h2>
              <strong>{origin.type}</strong> — <code>{origin.name}</code>
            </h2>
            <div>
              {origin.inputs.map((input) => (
                <div>
                  <div
                    class="expandable entry-container full-width card inverted"
                    onClick={(e: MouseEvent) =>
                      toggleInput(e.currentTarget as HTMLElement, origin, input)
                    }
                  >
                    <div class="entry" key={input.name}>
                      <span class="tag">{input.type}</span>
                      <span class="tag method">{input.variant}</span>
                      {input.name}
                    </div>
                    <span class="chevron-icon down">⮟</span>
                  </div>
                  <div class="expandable-content hidden">Loading...</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );

    const target = document.getElementById('lane-list');
    if (target) {
      target.replaceWith(list);
    }
  });

  return el;
};

render(<App />, document.getElementById('app')!);
