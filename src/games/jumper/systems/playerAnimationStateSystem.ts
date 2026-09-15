import { AnimationState } from "@/components/animationComponent";
import { VelocityComponent } from "@/components/velocityComponent";
import { CollidedComponent } from "@/games/jumper/components/collidedComponent";
import { JumpComponent } from "@/games/jumper/components/jumpComponent";
import { RocketFlightComponent } from "@/games/jumper/components/rocketFlightComponent";
import type { JumperSystem } from "@/games/jumper/world";
import type { JumperWorld } from "@/games/jumper/world";
import type { PlayerAnimationState } from "@/games/jumper/entities/player";
import { GodModComponent } from "@/games/jumper/components/godModComponent";

export class PlayerAnimationStateSystem implements JumperSystem {
	update(world: JumperWorld): void {
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
