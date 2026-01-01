import { Screen } from "../core/screen";
import type { World } from "../core/world";
import type { ISystem } from "./system";

export class DeathSystem implements ISystem {
	#screen: Screen;

	constructor(screen: Screen) {
		this.#screen = screen;
	}

	fixedUpdate(world: World): void {
		const player = world.getPlayer();
		const camera = world.getCamera();

		if (!player || !camera) return;

		const [playerTransform] = player.components;
		const [, cameraTransform] = camera.components;

		const cameraBottomY = this.#screen.getCameraBottomY(
			cameraTransform.position[1],
		);

		if (playerTransform.position[1] >= cameraBottomY) {
			return;
		}

		world.eventBus.emit("death", {
			entity: player.entity,
		});

		world.eventBus.emit("audioPlay", { name: "hurt", volume: 0.01 });
	}
}
