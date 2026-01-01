import type { ISystem } from "./system";
import { InputComponent } from "../components/inputComponent";
import { VelocityComponent } from "../components/velocityComponent";
import { MovementComponent } from "../components/movementComponent";
import { Vec2 } from "../primitives/vec2-gl";
import type { World } from "../core/world";
import { GodModComponent } from "../components/godModComponent";

export class MovementSystem implements ISystem {
	fixedUpdate(world: World, dt: number): void {
		const entities = world.query(
			InputComponent,
			VelocityComponent,
			MovementComponent,
		);

		for (const item of entities) {
			const [input, velocity, movement] = item.components;

			if (!input.enabled) continue;

			const t = Math.min(Math.max(movement.acceleration * dt, 0), 1);

			let directionX = 0;
			if (input.leftPressed) {
				directionX -= 1;
			}
			if (input.rightPressed) {
				directionX += 1;
			}

			let newX = velocity.value[0];
			if (directionX === 0) {
				newX = newX * movement.friction;
			} else {
				const targetSpeedX = directionX * movement.maxSpeed;
				newX = newX + (targetSpeedX - newX) * t;
			}

			let newY = velocity.value[1];
			if (world.hasComponent(item.entity, GodModComponent)) {
				let directionY = 0;

				if (input.topPressed || input.jumpPressed) {
					directionY = 1;
				}

				if (input.bottomPressed) {
					directionY = -1;
				}

				if (directionY === 0) {
					newY = newY * movement.friction;
				} else {
					const targetSpeedY = directionY * movement.maxSpeed;
					newY = newY + (targetSpeedY - newY) * t;
				}
			}

			Vec2.set(velocity.value, newX, newY);
		}
	}
}
