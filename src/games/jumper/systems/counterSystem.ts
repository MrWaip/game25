import type { SystemScope } from "@/systems/system";
import { ColliderComponent } from "@/games/jumper/components/colliderComponent";
import { CounterComponent } from "@/games/jumper/components/counterComponent";
import { PlayerComponent } from "@/games/jumper/components/playerComponent";
import { TransformComponent } from "@/components/transformComponent";
import { TextRenderComponent } from "@/components/textRenderComponent";
import type { JumperWorld } from "@/games/jumper/world";
import type { JumperSystem } from "@/games/jumper/world";

export class CounterSystem implements JumperSystem {
	#lastText: string[][] | undefined;
	#lastHeight: number | undefined;

	initialize(world: JumperWorld, scope: SystemScope): Promise<void> | void {
		scope.on(world.eventBus, "death", () => this.onDeath(world));
		scope.on(world.eventBus, "coinCollected", () =>
			this.onCoinCollected(world),
		);
	}

	fixedUpdate(world: JumperWorld): void {
		const playerEnt = world
			.query(TransformComponent, ColliderComponent, PlayerComponent)
			.next().value;

		if (!playerEnt) return;

		const [playerTransform, playerCollider] = playerEnt.components;

		for (const {
			components: [counter, render],
		} of world.query(CounterComponent, TextRenderComponent)) {
			const max = Math.round(
				Math.max(
					counter.height,
					(playerTransform.position[1] - playerCollider.offset[1]) / 10,
				),
			);

			const heightChanged = counter.height !== max;
			counter.height = max;
			const c = counter.coins;
			const h = counter.height;
			const f = counter.falls;

			const newText: string[][] = [
				["СЧЕТ", "ВЫСОТА", "ПОПЫТКИ"],
				[c.toString(), h.toString(), f.toString()],
			];

			if (
				!this.#lastText ||
				this.#lastText[1][0] !== newText[1][0] ||
				this.#lastText[1][1] !== newText[1][1] ||
				this.#lastText[1][2] !== newText[1][2]
			) {
				render.text = newText;
				this.#lastText = newText;
			}

			if (heightChanged && this.#lastHeight !== h) {
				this.emitCountersUpdated(world, counter);
				this.#lastHeight = h;
			}
		}
	}

	onDeath(world: JumperWorld) {
		const counter = world.getFirstComponent(CounterComponent);
		if (counter) {
			counter.falls++;
			this.emitCountersUpdated(world, counter);
		}
	}

	onCoinCollected(world: JumperWorld) {
		const counter = world.getFirstComponent(CounterComponent);
		if (counter) {
			counter.coins++;
			this.emitCountersUpdated(world, counter);
		}
	}

	private emitCountersUpdated(world: JumperWorld, counter: CounterComponent) {
		world.eventBus.emit("countersUpdated", {
			coins: counter.coins,
			height: counter.height,
			falls: counter.falls,
		});
	}
}
