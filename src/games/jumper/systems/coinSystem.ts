import type { SystemScope } from "@/systems/system";
import { CoinComponent } from "@/games/jumper/components/coinComponent";
import type { JumperWorld } from "@/games/jumper/world";
import type { GameEvents } from "@/games/jumper/events";
import type { JumperSystem } from "@/games/jumper/world";

export class CoinSystem implements JumperSystem {
	initialize(world: JumperWorld, scope: SystemScope): void {
		scope.on(world.eventBus, "trigger", (e) => this.onTrigger(world, e));
	}

	onTrigger(world: JumperWorld, { initiator, target }: GameEvents["trigger"]) {
		if (!world.hasComponent(target, CoinComponent)) {
			return;
		}

		world.deleteEntity(target);
		world.eventBus.emit("audioPlay", { name: "coinPickup", volume: 0.01 });
		world.eventBus.emit("coinCollected", { coin: target, player: initiator });
	}
}
