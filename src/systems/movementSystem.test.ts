import { describe, it, expect } from "vitest";
import { World } from "../core/world";
import { InputComponent } from "../components/inputComponent";
import { VelocityComponent } from "../components/velocityComponent";
import { MovementComponent } from "../components/movementComponent";
import { GodModComponent } from "../components/godModComponent";
import { MovementSystem } from "./movementSystem";
import { Vec2 } from "../primitives/vec2-gl";

describe("MovementSystem (godmod)", () => {
	it("обрабатывает вертикальное движение даже без горизонтального ввода", () => {
		const world = new World({ debug: false });
		world.registerComponent(InputComponent);
		world.registerComponent(VelocityComponent);
		world.registerComponent(MovementComponent);
		world.registerComponent(GodModComponent);

		const input = new InputComponent();
		input.topPressed = true;

		const velocity = new VelocityComponent(Vec2.fromValues(10, 0));
		const movement = new MovementComponent({
			acceleration: 100,
			friction: 0.5,
			maxSpeed: 5,
		});

		const entity = world.addEntity([
			input,
			velocity,
			movement,
			new GodModComponent(),
		]);

		const system = new MovementSystem();
		system.fixedUpdate(world, 1 / 60);

		const v = world.getComponent(entity, VelocityComponent)!.value;
		expect(v[0]).toBeCloseTo(5, 6);
		expect(v[1]).toBeCloseTo(5, 6);
	});

	it("применяет фрикцион по Y при отсутствии вертикального ввода", () => {
		const world = new World({ debug: false });
		world.registerComponent(InputComponent);
		world.registerComponent(VelocityComponent);
		world.registerComponent(MovementComponent);
		world.registerComponent(GodModComponent);

		const input = new InputComponent();
		input.rightPressed = true;

		const velocity = new VelocityComponent(Vec2.fromValues(0, 10));
		const movement = new MovementComponent({
			acceleration: 100,
			friction: 0.5,
			maxSpeed: 5,
		});

		const entity = world.addEntity([
			input,
			velocity,
			movement,
			new GodModComponent(),
		]);

		const system = new MovementSystem();
		system.fixedUpdate(world, 1 / 60);

		const v = world.getComponent(entity, VelocityComponent)!.value;
		expect(v[0]).toBeCloseTo(5, 6);
		expect(v[1]).toBeCloseTo(5, 6);
	});
});
