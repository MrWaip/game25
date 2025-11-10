
import type { ISystem } from "./system";
import type { World } from "../core/world";
import { VelocityComponent } from "../components/velocityComponent";
import { FacingComponent } from "../components/facingComponent";

export class FacingSystem implements ISystem {
  update(world: World): void {
    for (const {
      components: [vel, facing],
    } of world.query(VelocityComponent, FacingComponent)) {
      if (vel.value[0] > 0.01) {
        facing.direction = "right";
      } else if (vel.value[0] < -0.01) {
        facing.direction = "left";
      }
    }
  }
}
