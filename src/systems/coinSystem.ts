import { CoinComponent } from "../components/coinComponent";
import type { World } from "../core/world";
import type { GameEvents } from "../primitives/gameEvents";
import type { ISystem } from "./system";

export class CoinSystem implements ISystem {
	initialize(world: World): void {
		world.eventBus.on("trigger", (e) => this.onTrigger(world, e));
	}

	onTrigger(world: World, { initiator, target }: GameEvents["trigger"]) {
		if (!world.hasComponent(target, CoinComponent)) {
			return;
		}

		world.deleteEntity(target);
		world.eventBus.emit("audioPlay", { name: "coinPickup", volume: 0.01 });
		world.eventBus.emit("coinCollected", { coin: target, player: initiator });
	}
}
