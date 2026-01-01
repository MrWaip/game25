import { Screen } from "../core/screen";
import type { World } from "../core/world";
import { Vec2 } from "../primitives/vec2-gl";
import type { ISystem } from "./system";
import { GAME_CONSTANTS } from "../game/constants";
import { GodModComponent } from "../components/godModComponent";

export class RestartSystem implements ISystem {
	#screen: Screen;
	#tempCameraPos = Vec2.create();
	#tempPlayerPos = Vec2.create();

	constructor(screen: Screen) {
		this.#screen = screen;
	}

	initialize(world: World): Promise<void> | void {
		world.eventBus.on("death", () => this.onDeath(world));
	}

	onDeath(world: World) {
		const player = world.getPlayer();
		const camera = world.getCamera();

		if (!player || !camera) return;

		if (world.hasComponent(player.entity, GodModComponent)) {
			return;
		}

		const [playerTransform] = player.components;
		const [cameraComponent, cameraTransform] = camera.components;

		const worldWidth = this.#screen.getWorldWidth();

		Vec2.set(
			this.#tempPlayerPos,
			worldWidth / 2,
			GAME_CONSTANTS.PLAYER_START_Y,
		);
		playerTransform.move(this.#tempPlayerPos);
		cameraComponent.highestY = this.#screen.orthographicSize;
		Vec2.set(
			this.#tempCameraPos,
			worldWidth / 2,
			this.#screen.orthographicSize,
		);
		cameraTransform.move(this.#tempCameraPos);
	}
}
