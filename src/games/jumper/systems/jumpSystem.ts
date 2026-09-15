import type { JumperSystem } from "@/games/jumper/world";
import { JumpComponent } from "@/games/jumper/components/jumpComponent";
import { VelocityComponent } from "@/components/velocityComponent";
import { Gravity } from "@/games/jumper/components/gravityComponent";
import { CollidedComponent } from "@/games/jumper/components/collidedComponent";
import { InputComponent } from "@/games/jumper/components/inputComponent";
import { RocketFlightComponent } from "@/games/jumper/components/rocketFlightComponent";
import type { JumperWorld } from "@/games/jumper/world";
import { Vec2 } from "@/primitives/vec2-gl";

export class JumpSystem implements JumperSystem {
	fixedUpdate(world: JumperWorld): void {
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

			if (
				jump.isJumping &&
				!jumpHeld &&
				velocity.value[1] > jump.minJumpSpeed
			) {
				Vec2.set(velocity.value, velocity.value[0], jump.minJumpSpeed);
			}
		}
	}
}
