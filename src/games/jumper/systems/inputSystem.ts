import type { JumperSystem } from "@/games/jumper/world";
import { InputComponent } from "@/games/jumper/components/inputComponent";
import type { JumperWorld } from "@/games/jumper/world";
import type { InputStrategy } from "@/games/jumper/input";

const ACTIVE_CLASS = "touch-hint--active";

export class InputSystem implements JumperSystem {
	#strategy: InputStrategy;

	#leftControl: HTMLElement | null;
	#rightControl: HTMLElement | null;
	#centerControl: HTMLElement | null;

	constructor(strategy: InputStrategy) {
		this.#strategy = strategy;

		this.#leftControl = document.querySelector(
			".touch-hint--left",
		) as HTMLElement | null;
		this.#rightControl = document.querySelector(
			".touch-hint--right",
		) as HTMLElement | null;
		this.#centerControl = document.querySelector(
			".touch-hint--center",
		) as HTMLElement | null;
	}

	fixedUpdate(world: JumperWorld): void {
		const entities = world.query(InputComponent);

		for (const item of entities) {
			const [input] = item.components;

			if (!input.enabled) continue;

			input.jumpPressed = this.#strategy.isDown("jump");
			input.leftPressed = this.#strategy.isDown("moveLeft");
			input.rightPressed = this.#strategy.isDown("moveRight");
			input.topPressed = this.#strategy.isDown("moveTop");
			input.bottomPressed = this.#strategy.isDown("moveBottom");

			this.#leftControl?.classList.toggle(ACTIVE_CLASS, input.leftPressed);
			this.#rightControl?.classList.toggle(ACTIVE_CLASS, input.rightPressed);
			this.#centerControl?.classList.toggle(ACTIVE_CLASS, input.jumpPressed);
		}
	}

	destroy(): Promise<void> | void {
		this.#strategy.destroy();
	}
}
