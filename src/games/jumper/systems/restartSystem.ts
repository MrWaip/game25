import type { SystemScope } from "@/systems/system";
import { CameraTracking } from "@/games/jumper/components/cameraTrackingComponent";
import { PlayerComponent } from "@/games/jumper/components/playerComponent";
import { TransformComponent } from "@/components/transformComponent";
import { Screen } from "@/core/screen";
import type { JumperWorld } from "@/games/jumper/world";
import { Vec2 } from "@/primitives/vec2-gl";
import type { JumperSystem } from "@/games/jumper/world";
import { GAME_CONSTANTS } from "@/games/jumper/constants";
import { GodModComponent } from "@/games/jumper/components/godModComponent";

export class RestartSystem implements JumperSystem {
	#screen: Screen;
	#tempCameraPos = Vec2.create();
	#tempPlayerPos = Vec2.create();

	constructor(screen: Screen) {
		this.#screen = screen;
	}

	initialize(world: JumperWorld, scope: SystemScope): Promise<void> | void {
		scope.on(world.eventBus, "death", () => this.onDeath(world));
	}

	onDeath(world: JumperWorld) {
		const player = world.getFirst(TransformComponent, PlayerComponent);
		const camera = world.getCamera();

		if (!player || !camera) return;

		if (world.hasComponent(player.entity, GodModComponent)) {
			return;
		}

		const [playerTransform] = player.components;
		const [, cameraTransform] = camera.components;
		const cameraComponent = world.getComponent(camera.entity, CameraTracking)!;

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
