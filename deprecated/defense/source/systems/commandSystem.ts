import {
	upgrades,
	type UpgradeDefinition,
} from "@/games/defense/definitions/upgrades";
import type { World } from "@/core/world";
import { Run } from "@/games/defense/components/runComponent";
import { Tower } from "@/games/defense/components/towerComponent";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { type Upgrade, starters, type Starter } from "@/games/defense/config";
import { validCell } from "@/games/defense/board";
import { validPortalPair } from "@/games/defense/effects/portal";
import { eligibleReward } from "@/games/defense/rewards";
import { waveAt } from "@/games/defense/waves";
import type { ISystem } from "@/systems/system";
import { jokerSlots, ownedJokers, shopOffers } from "@/games/defense/shop";
import {
	orderOverdrive,
	orderPriority,
} from "@/games/defense/commands/towerOrders";
import {
	buyOffer,
	holdOffer,
	rerollShop,
	sellJoker,
} from "@/games/defense/commands/shopCommands";
import {
	expandDefense,
	type ExpansionChoice,
} from "@/games/defense/commands/progressionCommands";
export class CommandSystem implements ISystem {
	#world!: World;
	initialize(world: World): void {
		this.#world = world;
	}
	restart(seed: string): boolean {
		const run = this.#world.getFirstComponent(Run)!;
		for (const { entity } of [
			...this.#world.query(Tower),
			...this.#world.query(Enemy),
		])
			this.#world.deleteEntity(entity);
		Object.assign(run, new Run(seed));
		return true;
	}
	chooseStarter(starter: Starter): boolean {
		const run = this.#world.getFirstComponent(Run)!;
		if (run.phase !== "draft" || !Object.hasOwn(starters, starter))
			return false;
		this.grant(starters[starter].upgrade);
		run.phase = "prepare";
		run.shop = shopOffers(run);
		return true;
	}
	private grant(choice: Upgrade): void {
		const run = this.#world.getFirstComponent(Run)!;
		run.bonuses[choice]++;
		const definition: UpgradeDefinition = upgrades[choice];
		if (definition.world) run.pendingWorld = definition.world;
	}
	placeSnow(cell: number): boolean {
		const run = this.#world.getFirstComponent(Run)!;
		if (
			run.phase !== "prepare" ||
			!run.bonuses.snowfall ||
			!validCell(run.map, cell)
		)
			return false;
		run.snow = cell;
		if (run.pendingWorld === "snow") run.pendingWorld = null;
		return true;
	}
	placePortal(entrance: number, exit: number): boolean {
		const run = this.#world.getFirstComponent(Run)!;
		if (
			run.phase !== "prepare" ||
			!run.bonuses.portal ||
			!validPortalPair(run.map, entrance, exit)
		)
			return false;
		run.portal = { entrance, exit, cooldown: 0 };
		if (run.pendingWorld === "portal") run.pendingWorld = null;
		return true;
	}
	startWave(): boolean {
		const world = this.#world;
		const run = world.getFirstComponent(Run)!;
		if (run.phase !== "prepare" || run.pendingWorld || run.expansionDue)
			return false;
		run.phase = "wave";
		run.wave++;
		run.remaining = waveAt(run.wave).enemies.length;
		run.spawnIn = 0;
		run.elapsed = 0;
		run.waveKills = 0;
		run.waveLeaks = 0;
		run.teleports = 0;
		run.shatters = 0;
		run.overdrives = 2;
		for (const {
			components: [tower],
		} of world.query(Tower))
			tower.overdrive = 0;
		if (run.portal) run.portal.cooldown = 0;
		return true;
	}
	overdrive(cell: number): boolean {
		return orderOverdrive(this.#world, cell);
	}
	priority(cell: number, priority: Tower["priority"]): boolean {
		return orderPriority(this.#world, cell, priority);
	}
	choose(choice: Upgrade): boolean {
		const world = this.#world;
		const run = world.getFirstComponent(Run)!;
		if (
			run.phase !== "reward" ||
			!run.choices.includes(choice) ||
			!eligibleReward(run.bonuses, choice)
		)
			return false;
		if (!run.bonuses[choice] && ownedJokers(run.bonuses).length >= jokerSlots)
			return false;
		this.grant(choice);
		run.choices = [];
		run.phase = "prepare";
		return true;
	}
	continue(): boolean {
		const run = this.#world.getFirstComponent(Run)!;
		if (run.phase !== "reward") return false;
		run.choices = [];
		run.phase = "prepare";
		return true;
	}
	buy(key: Upgrade): boolean {
		return buyOffer(this.#world.getFirstComponent(Run)!, key, (upgrade) =>
			this.grant(upgrade),
		);
	}
	sellJoker(key: Upgrade): boolean {
		return sellJoker(this.#world.getFirstComponent(Run)!, key);
	}
	reroll(): boolean {
		return rerollShop(this.#world.getFirstComponent(Run)!);
	}
	hold(key: Upgrade): boolean {
		return holdOffer(this.#world.getFirstComponent(Run)!, key);
	}
	expand(kind: ExpansionChoice): boolean {
		return expandDefense(this.#world.getFirstComponent(Run)!, kind);
	}
}
