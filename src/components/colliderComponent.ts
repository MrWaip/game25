import { Vec2 } from "../primitives/vec2-gl";
import { Component } from "./component";

type Options = {
  size: Vec2;
  offset?: Vec2;
  isTrigger?: boolean;
  oneWay?: boolean;
};

export class ColliderComponent extends Component {
  #size: Vec2;
  #offset: Vec2;
  #isTrigger: boolean;
  #oneWay: boolean;
  #enabled: boolean;

  constructor(options: Options) {
    super();

    this.#size = options.size;
    this.#offset = options.offset ?? Vec2.create();
    this.#isTrigger = options.isTrigger ?? false;
    this.#oneWay = options.oneWay ?? false;
    this.#enabled = true;
  }

  enable() {
    this.#enabled = true;
  }

  disable() {
    this.#enabled = false;
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  get size(): Vec2 {
    return this.#size;
  }

  get offset(): Vec2 {
    return this.#offset;
  }

  get isTrigger(): boolean {
    return this.#isTrigger;
  }

  get oneWay(): boolean {
    return this.#oneWay;
  }
}
