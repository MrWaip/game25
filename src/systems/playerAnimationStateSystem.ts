import { AnimationState } from "../components/animationComponent";
import { VelocityComponent } from "../components/velocityComponent";
import { CollidedComponent } from "../components/collidedComponent";
import { JumpComponent } from "../components/jumpComponent";
import { RocketFlightComponent } from "../components/rocketFlightComponent";
import type { ISystem } from "./system";
import type { World } from "../core/world";
import type { PlayerAnimationState } from "../entities/player";
import { GodModComponent } from "../components/godModComponent";

export class PlayerAnimationStateSystem implements ISystem {
	update(world: World): void {
		for (const {
			entity,
			components: [state, velocity, jump],
		} of world.query(
			AnimationState<PlayerAnimationState>,
			VelocityComponent,
			JumpComponent,
		)) {
			if (world.hasComponent(entity, RocketFlightComponent)) {
				state.set("rocket-fly");
				continue;
			}

			if (world.hasComponent(entity, GodModComponent)) {
				state.set("flyingSleigh");
				continue;
			}

			const collided = world.getComponent(entity, CollidedComponent);
			const grounded = collided?.isGrounded ?? false;
			const startedJump = jump.startedThisFrame;

			if (startedJump) {
				state.set("jump", true);
				jump.consumeJumpStart();
				continue;
			}

			if (!grounded) {
				state.set("jump");
				continue;
			}

			if (Math.abs(velocity.value[0]) > 4) {
				state.set("run");
				continue;
			}

			state.set("idle");
		}
	}
}
