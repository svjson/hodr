/** @jsx h */
import { h, Component, render } from 'nano-jsx';
import 'pretty-json-custom-element';

import './components/Collapsible';
import { Origin } from './model';
import { OriginCard } from './components/OriginCard';

class LaneList extends Component<{ origins: any }> {
  render() {
    const { origins } = this.props;

    return (
      <div>
        {origins.map((origin: Origin) => (
          <OriginCard origin={origin} />
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
