import { RocketFlightComponent } from "../components/rocketFlightComponent";
import { Gravity } from "../components/gravityComponent";
import { VelocityComponent } from "../components/velocityComponent";
import { TransformComponent } from "../components/transformComponent";
import { AnimationState } from "../components/animationComponent";
import type { World } from "../core/world";
import type { ISystem } from "./system";
import { Vec2 } from "../primitives/vec2-gl";
import type { PlayerAnimationState } from "../entities/player";

const ROCKET_FLIGHT_SPEED = 800;

export class RocketFlightSystem implements ISystem {
	fixedUpdate(world: World): void {
		const entities = world.query(
			RocketFlightComponent,
			VelocityComponent,
			TransformComponent,
		);

		for (const item of entities) {
			const [flight, velocity, transform] = item.components;

			if (transform.position[1] >= flight.targetY) {
				Vec2.set(transform.position, transform.position[0], flight.targetY);
				Vec2.set(velocity.value, velocity.value[0], 1500);
				world.removeComponent(item.entity, RocketFlightComponent);
				world.enableComponent(item.entity, Gravity);

				const animationState = world.getComponent(
					item.entity,
					AnimationState<PlayerAnimationState>,
				);
				if (animationState) {
					animationState.set("idle", true);
				}

				continue;
			}

			Vec2.set(velocity.value, velocity.value[0], ROCKET_FLIGHT_SPEED);
		}
	}
}
