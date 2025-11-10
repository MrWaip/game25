import type { ISystem } from "./system";
import { JumpComponent } from "../components/jumpComponent";
import { VelocityComponent } from "../components/velocityComponent";
import { Gravity } from "../components/gravityComponent";
import { CollidedComponent } from "../components/collidedComponent";
import { InputComponent } from "../components/inputComponent";
import { RocketFlightComponent } from "../components/rocketFlightComponent";
import type { World } from "../core/world";
import { Vec2 } from "../primitives/vec2-gl";

export class JumpSystem implements ISystem {
  fixedUpdate(world: World): void {
    const entities = world.query(JumpComponent, VelocityComponent);

    const now = world.getCurrentTime() / 1000;

    for (const item of entities) {
      const [jump, velocity] = item.components;

      if (world.hasComponent(item.entity, RocketFlightComponent)) {
        continue;
      }

      const gravity = world.getComponent(item.entity, Gravity);
      if (!gravity) continue;

      const collided = world.getComponent(item.entity, CollidedComponent);
      const grounded = collided?.isGrounded ?? false;

      const input = world.getComponent(item.entity, InputComponent);
      const jumpHeld = input?.jumpPressed ?? false;

      
      if (grounded) {
        jump.recordGrounded(now);
        jump.isJumping = false;
      }

      if (grounded && jumpHeld) {
        world.eventBus.emit("audioPlay", { name: "jump", volume: 0.01 });
      }

      
      if (!jump.isJumping && jumpHeld) {
        jump.recordJumpPress(now);

        if (jump.canJump(now)) {
          const g = Math.abs(gravity.acceleration[1]);
          const jumpSpeed = Math.sqrt(2 * g * jump.jumpHeight) * 1.02;

          
          jump.minJumpSpeed = jumpSpeed * 0.35;

          Vec2.set(velocity.value, velocity.value[0], jumpSpeed);
          jump.consumeJump();
          jump.isJumping = true;
          jump.markJumpStarted();

          continue;
        }
      }

      
      if (jump.isJumping && !jumpHeld && velocity.value[1] > jump.minJumpSpeed) {
        Vec2.set(velocity.value, velocity.value[0], jump.minJumpSpeed);
      }
    }
  }
}
