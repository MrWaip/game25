import { World } from "@/core/world";
import { EventBus } from "@/systems/eventBus";
import type { ISystem } from "@/systems/system";
import type { GameEvents } from "@/games/jumper/events";

export class JumperWorld extends World {
	readonly eventBus = new EventBus<GameEvents>();
	constructor(options: ConstructorParameters<typeof World>[0]) {
		super(options);
		// Registered first, disposed last, including rollback of failed initialization.
		this.registerSystem({ destroy: () => this.eventBus.clear() });
	}
}
export type JumperSystem = ISystem<JumperWorld>;
