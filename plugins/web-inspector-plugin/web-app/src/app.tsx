/** @jsx h */
import { h, Component, render } from 'nano-jsx';
import 'pretty-json-custom-element';

import { Execution } from './components/Execution';
import { toggleExpandable } from './components/Expandable';
import { InputEntry } from './components/InputEntry';
import './components/Collapsible';
import { Origin, ExecutionContext } from './model';

class LaneList extends Component<{ origins: any }> {
  render() {
    const { origins } = this.props;

    return (
      <div>
        {origins.map((origin: Origin) => (
          <div class="card">
            <h2>
              <strong>{origin.type}</strong> — <code>{origin.name}</code>
            </h2>
            <div>
              {origin.inputs.map((input) => (
                <InputEntry origin={origin} input={input} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
}

class App extends Component {
  render() {
    queueMicrotask(async () => {
      const res = await fetch('/__inspector/api/application');
      const data = await res.json();

      const title = data.appName ?? data.appId;
      if (title) {
        (document.querySelector('#application-name')! as HTMLElement).innerText = title;
      }
    });

    queueMicrotask(async () => {
      const res = await fetch('/__inspector/api/origins');
      const data = await res.json();

      render(<LaneList origins={data} />, document.getElementById('lane-list'));
    });

    return (
      <div class="container">
        <h1 class="page-title-bar">
          <code>Hodr Inspector</code>
          <code id="application-name"></code>
        </h1>
        <div id="lane-list">
          <div>Loading lanes...</div>
        </div>
      </div>
    );
  }
}

render(<App />, document.getElementById('app')!);
