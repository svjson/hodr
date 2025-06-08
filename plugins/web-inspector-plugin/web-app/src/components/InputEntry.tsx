/** @jsx h */
import { h, Component, render } from 'nano-jsx';
import { ExecutionContext, InputId, Origin } from '../model';
import { Execution } from './Execution';

type InputEntryProps = { origin: Origin; input: InputId };

export class InputEntry extends Component<InputEntryProps> {
  constructor(props: InputEntryProps) {
    super(props);
    this.state = {
      expanded: false,
      executions: null,
    };
  }

  fetchExecutions = () => {
    const { name, variant } = this.props.input;
    const origin = this.props.origin.name;
    fetch(
      `/__inspector/api/origins/${origin}/input/${encodeURIComponent(name)}/${variant}/executions`
    ).then(async (response) => {
      this.setState({ executions: await response.json() });
      this.update();
    });
  };

  toggle = () => {
    const expanded = !this.state.expanded;
    this.setState({ expanded: expanded });

    if (expanded) {
      this.fetchExecutions();
    } else {
      this.update();
    }
  };

  render() {
    const { origin, input } = this.props;
    const { expanded, executions } = this.state;

    return (
      <div>
        <div class="expandable entry-container full-width card inverted" onClick={this.toggle}>
          <div class="entry" key={input.name}>
            <span class="tag">{input.type}</span>
            <span class="tag method">{input.variant}</span>
            {input.name}
          </div>
          <span class={'chevron-icon' + (expanded ? ' up' : ' down')}>⮟</span>
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
  }
}
