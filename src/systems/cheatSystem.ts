import { GodModComponent } from "../components/godModComponent";
import { PlayerComponent } from "../components/playerComponent";
import type { World } from "../core/world";
import type { ISystem } from "./system";

export class CheatSystem implements ISystem {
	#code: string;
	#world: World | null;

	constructor() {
		window.addEventListener("keydown", this.#onKeyDown);
		this.#code = "";
		this.#world = null;
	}

	initialize(world: World): void {
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

		const [camera] = this.#world.getCamera()!.components;

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
