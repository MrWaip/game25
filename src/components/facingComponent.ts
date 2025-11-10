import { Component } from "./component";

type Direction = "left" | "right";

export class FacingComponent extends Component {
  public direction: Direction;

  constructor(direction: Direction) {
    super();

    this.direction = direction;
  }
}
