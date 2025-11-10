import { Component } from "./component";

export class CounterComponent extends Component {
  public coins: number;
  public height: number;
  public falls: number;

  constructor() {
    super();

    this.coins = 0;
    this.height = 0;
    this.falls = 0;
  }
}
