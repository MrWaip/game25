import { PlayerComponent } from "@/games/jumper/components/playerComponent";
import { TransformComponent } from "@/components/transformComponent";
import { Screen } from "@/core/screen";
import type { JumperWorld } from "@/games/jumper/world";
import type { JumperSystem } from "@/games/jumper/world";

export class DeathSystem implements JumperSystem {
	#screen: Screen;

	constructor(screen: Screen) {
		this.#screen = screen;
	}

	fixedUpdate(world: JumperWorld): void {
		const player = world.getFirst(TransformComponent, PlayerComponent);
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
