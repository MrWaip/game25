import { describe, it, expect } from "vitest";
import { World } from "../core/world";
import { TransformComponent } from "../components/transformComponent";
import { Camera } from "../components/cameraComponent";
import { FollowCameraComponent } from "../components/followCameraComponent";
import { CameraSystem } from "./cameraSystem";
import { Vec2 } from "../primitives/vec2-gl";
import { Screen } from "../core/screen";

describe("CameraSystem (follow camera functionality)", () => {
	it("синхронизирует Y сущности с камерой (для стен, которые followCameraY)", () => {
		const world = new World({ debug: false });
		world.registerComponent(TransformComponent);
		world.registerComponent(Camera);
		world.registerComponent(FollowCameraComponent);

		const screenSize = Vec2.fromValues(800, 600);
		const orthographicSize = screenSize[1] / 2;
		const screen = new Screen(screenSize, 1, orthographicSize);

		const cameraEntity = world.addEntity([
			new TransformComponent(Vec2.fromValues(0, 100)),
			new Camera({
				highestY: 0,
			}),
		]);

		const wallEntity = world.addEntity([
			new TransformComponent(Vec2.fromValues(5, 0)),
			new FollowCameraComponent(false, true),
		]);

		const system = new CameraSystem(screen);
		system.fixedUpdate(world);

		const cameraTransform = world.getComponent(
			cameraEntity,
			TransformComponent,
		)!;
		const wallTransform = world.getComponent(wallEntity, TransformComponent)!;

		expect(wallTransform.position[0]).toBe(5);
		expect(wallTransform.position[1]).toBe(100);

		expect(cameraTransform.position[0]).toBe(0);
		expect(cameraTransform.position[1]).toBe(100);
	});

	it("синхронизирует X сущности с камерой", () => {
		const world = new World({ debug: false });
		world.registerComponent(TransformComponent);
		world.registerComponent(Camera);
		world.registerComponent(FollowCameraComponent);

		const screenSize = Vec2.fromValues(800, 600);
		const orthographicSize = screenSize[1] / 2;
		const screen = new Screen(screenSize, 1, orthographicSize);

		const cameraEntity = world.addEntity([
			new TransformComponent(Vec2.fromValues(123, 100)),
			new Camera({
				highestY: 0,
			}),
		]);

		const entity = world.addEntity([
			new TransformComponent(Vec2.fromValues(5, 7)),
			new FollowCameraComponent(true, false),
		]);

		const system = new CameraSystem(screen);
		system.fixedUpdate(world);

		const cameraTransform = world.getComponent(
			cameraEntity,
			TransformComponent,
		)!;
		const transform = world.getComponent(entity, TransformComponent)!;

		expect(transform.position[0]).toBe(123);
		expect(transform.position[1]).toBe(7);
		expect(cameraTransform.position[0]).toBe(123);
		expect(cameraTransform.position[1]).toBe(100);
	});
});
