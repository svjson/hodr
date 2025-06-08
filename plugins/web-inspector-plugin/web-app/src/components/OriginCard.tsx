/** @jsx h */
import { h, Component, render } from 'nano-jsx';
import { Origin } from '../model';
import { InputEntry } from './InputEntry';

export class OriginCard extends Component<{ origin: Origin }> {
  render() {
    const { origin } = this.props;

    return (
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
    );
  }
}
