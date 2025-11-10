import type { Vec2 } from "../primitives/vec2-gl";
import { Component } from "./component";

type Options = {
  acceleration: Vec2;
};

export class Gravity extends Component {
  #acceleration: Vec2;

  constructor(options: Options) {
    super();
    this.#acceleration = options.acceleration;
  }

  public get acceleration(): Vec2 {
    return this.#acceleration;
  }
}
