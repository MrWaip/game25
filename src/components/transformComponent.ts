import { Vec2 } from "../primitives/vec2-gl";
import { Component } from "./component";

export class TransformComponent extends Component {
  #position: Vec2;

  constructor(position: Vec2) {
    super();

    this.#position = position;
  }

  get x(): number {
    return this.#position[0];
  }

  get y(): number {
    return this.#position[1];
  }

  get position(): Vec2 {
    return this.#position;
  }

  set position(value: Vec2) {
    Vec2.set(this.#position, value[0], value[1]);
  }

  public move(value: Vec2) {
    Vec2.set(this.#position, value[0], value[1]);
  }
}
