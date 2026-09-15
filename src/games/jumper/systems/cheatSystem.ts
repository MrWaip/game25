import { CameraTracking } from "@/games/jumper/components/cameraTrackingComponent";
import { GodModComponent } from "@/games/jumper/components/godModComponent";
import { PlayerComponent } from "@/games/jumper/components/playerComponent";
import type { JumperWorld } from "@/games/jumper/world";
import type { JumperSystem } from "@/games/jumper/world";

export class CheatSystem implements JumperSystem {
	#code: string;
	#world: JumperWorld | null;

	constructor() {
		window.addEventListener("keydown", this.#onKeyDown);
		this.#code = "";
		this.#world = null;
	}

	initialize(world: JumperWorld): void {
		this.#world = world;
	}

	#onKeyDown = (e: KeyboardEvent) => {
		if (e.code === "Enter") {
			switch (this.#code) {
				case "whosyourdaddy":
					this.toggleGodMod();
					break;
			}

			this.#code = "";
			return;
		} else {
			if (this.#code.length >= 20) {
				this.#code = "";
			}

			this.#code += e.key;
		}
	};

	destroy(): Promise<void> | void {
		window.removeEventListener("keydown", this.#onKeyDown);
	}

	toggleGodMod() {
		if (!this.#world) return;

		const camera = this.#world.getFirstComponent(CameraTracking)!;

		for (const { entity } of this.#world.query(PlayerComponent)) {
			if (this.#world.hasComponent(entity, GodModComponent)) {
				this.#world.removeComponent(entity, GodModComponent);
				// this.#world.enableComponent(entity, Gravity);
				camera.allowFollowDown = false;
			} else {
				this.#world.updateComponent(entity, new GodModComponent());
				// this.#world.disableComponent(entity, Gravity);
				camera.allowFollowDown = true;
			}
		}
	}
}
