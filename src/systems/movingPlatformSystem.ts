import { MovingPlatformComponent } from "../components/movingPlatformComponent";
import { TransformComponent } from "../components/transformComponent";
import { VelocityComponent } from "../components/velocityComponent";
import type { World } from "../core/world";
import { Vec2 } from "../primitives/vec2-gl";
import type { ISystem } from "./system";

export class MovingPlatformSystem implements ISystem {
	#temp = Vec2.create();

	fixedUpdate(world: World, dt: number): void {
		const entities = world.query(
			TransformComponent,
			VelocityComponent,
			MovingPlatformComponent,
		);

		for (const { components } of entities) {
			const [transform, velocity, moving] = components;

			if (moving.min === moving.max || moving.speed <= 0) {
				Vec2.set(velocity.value, 0, 0);
				continue;
			}

			const axisIndex = moving.axis === "x" ? 0 : 1;
			const current = transform.position[axisIndex];
			const delta = moving.speed * dt * moving.direction;
			let next = current + delta;

			if (next > moving.max) {
				const overshoot = next - moving.max;
				next = moving.max - overshoot;
				moving.direction = -1;
			}

			if (next < moving.min) {
				const overshoot = moving.min - next;
				next = moving.min + overshoot;
				moving.direction = 1;
			}

			const moved = next - current;

			if (axisIndex === 0) {
				Vec2.set(this.#temp, next, transform.position[1]);
				Vec2.set(velocity.value, moved / dt, 0);
			} else {
				Vec2.set(this.#temp, transform.position[0], next);
				Vec2.set(velocity.value, 0, moved / dt);
			}

			transform.move(this.#temp);
		}
	}
}
