import { createTower } from "@/games/defense/entities/tower";
import type { World } from "@/core/world";
import type { ISystem } from "@/systems/system";
import { Run } from "@/games/defense/components/runComponent";
import { Tower } from "@/games/defense/components/towerComponent";
import type { TowerKind } from "@/games/defense/definitions/towers";
import {
	quoteConstruction,
	quoteUpgrade,
	canRelocate,
	saleValue,
} from "@/games/defense/constructionRules";

export class ConstructionSystem implements ISystem {
	#world!: World;
	initialize(world: World): void {
		this.#world = world;
	}
	private state() {
		const run = this.#world.getFirstComponent(Run)!;
		return {
			phase: run.phase,
			map: run.map,
			coins: run.coins,
			towers: [...this.#world.query(Tower)].map(
				({ components: [tower] }) => tower,
			),
		};
	}
	build(cell: number, kind: TowerKind, replace = false): boolean {
		const quote = quoteConstruction(this.state(), cell, kind, replace);
		if (!quote) return false;
		const current = [...this.#world.query(Tower)].find(
			({ components: [tower] }) => tower.slot === cell,
		);
		if (current) this.#world.deleteEntity(current.entity);
		this.#world.addEntity(createTower(cell, kind));
		this.#world.getFirstComponent(Run)!.coins += quote.refund - quote.spend;
		return true;
	}
	sell(cell: number): boolean {
		const run = this.#world.getFirstComponent(Run)!;
		const current = [...this.#world.query(Tower)].find(
			({ components: [tower] }) => tower.slot === cell,
		);
		if (run.phase !== "prepare" || !current) return false;
		run.coins += saleValue(current.components[0]);
		this.#world.deleteEntity(current.entity);
		return true;
	}
	improve(cell: number): boolean {
		const state = this.state(),
			quote = quoteUpgrade(state, cell);
		if (!quote) return false;
		state.towers.find((t) => t.slot === cell)!.level++;
		this.#world.getFirstComponent(Run)!.coins -= quote.spend;
		return true;
	}
	relocate(from: number, to: number): boolean {
		const state = this.state();
		if (!canRelocate(state, from, to)) return false;
		const source = state.towers.find((t) => t.slot === from)!;
		const destination = state.towers.find((t) => t.slot === to);
		source.slot = to;
		if (destination) destination.slot = from;
		return true;
	}
}
