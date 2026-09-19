import type { Tower } from "@/games/defense/components/towerComponent";
import type { Starter, TowerKind, Upgrade } from "@/games/defense/config";

/** The command interface of a defense session. Adding an action changes this
 * union and its owner, without adding another method through every adapter. */
export type DefenseCommand =
	| { type: "run.restart"; seed?: string }
	| { type: "run.chooseStarter"; starter: Starter }
	| { type: "run.continue" }
	| { type: "wave.start" }
	| { type: "reward.choose"; choice: Upgrade }
	| { type: "world.placeSnow"; cell: number }
	| { type: "world.placePortal"; entrance: number; exit: number }
	| { type: "tower.build"; cell: number; kind: TowerKind }
	| { type: "tower.replace"; cell: number; kind: TowerKind }
	| { type: "tower.improve"; cell: number }
	| { type: "tower.sell"; cell: number }
	| { type: "tower.relocate"; from: number; to: number }
	| { type: "tower.specialize"; cell: number; choice: "focus" | "spread" }
	| { type: "tower.overdrive"; cell: number }
	| { type: "tower.priority"; cell: number; priority: Tower["priority"] }
	| { type: "shop.buy"; upgrade: Upgrade }
	| { type: "shop.sell"; upgrade: Upgrade }
	| { type: "shop.reroll" }
	| { type: "shop.hold"; upgrade: Upgrade }
	| { type: "progression.expand"; choice: "limit" | "income" };
