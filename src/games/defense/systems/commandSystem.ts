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
		if (run.phase !== "prepare" || run.pendingWorld) return false;
		run.phase = "wave";
		run.wave++;
		run.remaining = waveAt(run.wave).enemies.length;
		run.spawnIn = 0;
		run.elapsed = 0;
		run.waveKills = 0;
		run.waveLeaks = 0;
		run.teleports = 0;
		run.shatters = 0;
		if (run.portal) run.portal.cooldown = 0;
		return true;
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
		this.grant(choice);
		run.choices = [];
		run.phase = "prepare";
		return true;
	}
}
