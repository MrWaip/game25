import type { Entity } from "../entities/entity";
import type { Vec2 } from "../primitives/vec2-gl";
import { Component } from "./component";

type Collision = {
  entity: Entity;
  normal: Vec2;
  time: number;
};

export class CollidedComponent extends Component {
  #collisions: Collision[];

  constructor(collisions: Collision[]) {
    super();

    this.#collisions = collisions;
  }

  get isGrounded(): boolean {
    return this.#collisions.some((c) => c.normal[1] > 0);
  }

  get hitCeiling(): boolean {
    return this.#collisions.some((c) => c.normal[1] < 0);
  }

  get isAgainstWall(): boolean {
    return this.#collisions.some((c) => c.normal[0] !== 0);
  }

  verticalCollisions() {
    return this.#collisions.filter((c) => c.normal[1] !== 0);
  }

  horizontalCollisions() {
    return this.#collisions.filter((c) => c.normal[0] !== 0);
  }
}
