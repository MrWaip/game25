import { describe, it, expect } from "vitest";
import { CollidedComponent } from "./collidedComponent";
import { Vec2 } from "../primitives/vec2-gl";

describe("CollidedComponent", () => {
	it("should detect grounded collision", () => {
		const collisions = [
			{ entity: 1, normal: Vec2.fromValues(0, 1), time: 0 },
			{ entity: 2, normal: Vec2.fromValues(1, 0), time: 0 },
		];
		const component = new CollidedComponent(collisions);

		expect(component.isGrounded).toBe(true);
	});

	it("should detect ceiling collision", () => {
		const collisions = [{ entity: 1, normal: Vec2.fromValues(0, -1), time: 0 }];
		const component = new CollidedComponent(collisions);

		expect(component.hitCeiling).toBe(true);
	});

	it("should detect wall collision", () => {
		const collisions = [{ entity: 1, normal: Vec2.fromValues(1, 0), time: 0 }];
		const component = new CollidedComponent(collisions);

		expect(component.isAgainstWall).toBe(true);
	});

	it("should filter vertical collisions", () => {
		const collisions = [
			{ entity: 1, normal: Vec2.fromValues(0, 1), time: 0 },
			{ entity: 2, normal: Vec2.fromValues(1, 0), time: 0 },
			{ entity: 3, normal: Vec2.fromValues(0, -1), time: 0 },
		];
		const component = new CollidedComponent(collisions);

		const vertical = component.verticalCollisions();
		expect(vertical).toHaveLength(2);
	});

	it("should filter horizontal collisions", () => {
		const collisions = [
			{ entity: 1, normal: Vec2.fromValues(1, 0), time: 0 },
			{ entity: 2, normal: Vec2.fromValues(0, 1), time: 0 },
			{ entity: 3, normal: Vec2.fromValues(-1, 0), time: 0 },
		];
		const component = new CollidedComponent(collisions);

		const horizontal = component.horizontalCollisions();
		expect(horizontal).toHaveLength(2);
	});
});
