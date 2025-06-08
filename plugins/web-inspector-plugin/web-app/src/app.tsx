/** @jsx h */
import { h, Component, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
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

const App = () => {
  const [appName, setAppName] = useState('');
  const [origins, setOrigins] = useState<Origin[] | null>(null);

  useEffect(() => {
    fetch('/__inspector/api/application')
      .then((res) => res.json())
      .then((data) => {
        const title = data.appName ?? data.appId;
        if (title) {
          setAppName(title);
          document.title = document.title + ' - ' + title;
        }
      });
  }, []);

  useEffect(() => {
    fetch('/__inspector/api/origins')
      .then((res) => res.json())
      .then(setOrigins);
  }, []);

  return (
    <div class="container">
      <h1 class="page-title-bar">
        <code>Hodr Inspector</code>
        <code id="application-name">{appName}</code>
      </h1>
      <div id="lane-list">
        {origins ? <LaneList origins={origins} /> : <div>Loading lanes...</div>}
      </div>
    </div>
  );
};

render(<App />, document.getElementById('app')!);
