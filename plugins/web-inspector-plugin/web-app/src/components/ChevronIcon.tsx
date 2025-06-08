/** @jsx h */
import { h, Component, render } from 'preact';

export class ChevronIcon extends Component<{ expanded: boolean }> {
  render() {
    return <span class={'chevron-icon' + (this.props.expanded ? ' up' : ' down')}>⮟</span>;
  }
}
