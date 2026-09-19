import { economy } from "@/games/defense/config";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import {
	towerDefinitions,
	type TowerKind,
} from "@/games/defense/definitions/towers";
import {
	isBuildable,
	distanceToRoad,
	grid,
	type DefenseMap,
} from "@/games/defense/board";
import type { Tower } from "@/games/defense/components/towerComponent";

type ConstructionState = Pick<
	DefenseSnapshot,
	"phase" | "coins" | "towers" | "map" | "towerLimit"
>;
/** Towers may be built on any land cell in the two-cell strip along a road. */
export function isConstructionSite(
	map: DefenseMap,
	cell: number,
	_kind?: TowerKind,
): boolean {
	return isBuildable(map, cell) && distanceToRoad(map, cell) <= grid.cell * 2;
}
export type ConstructionQuote = { spend: number; refund: number };
export function saleValue(tower: Pick<Tower, "kind" | "level">): number {
	const invested =
		towerDefinitions[tower.kind].cost +
		(economy.upgradeCost * tower.level * (tower.level - 1)) / 2;
	return Math.floor(invested * economy.saleFraction);
}
export function quoteConstruction(
	state: ConstructionState,
	cell: number,
	kind: TowerKind,
	replace = false,
): ConstructionQuote | null {
	if (
		state.phase !== "prepare" ||
		!Object.hasOwn(towerDefinitions, kind) ||
		!isConstructionSite(state.map, cell, kind)
	)
		return null;
	const current = state.towers.find((t) => t.slot === cell);
	if (replace ? !current || current.kind === kind : !!current) return null;
	if (!current && state.towers.length >= state.towerLimit) return null;
	const quote = {
		spend: towerDefinitions[kind].cost,
		refund: current ? saleValue(current) : 0,
	};
	return state.coins + quote.refund >= quote.spend ? quote : null;
}
export function quoteUpgrade(
	state: ConstructionState,
	cell: number,
): ConstructionQuote | null {
	const tower = state.towers.find((t) => t.slot === cell);
	if (
		state.phase !== "prepare" ||
		!tower ||
		tower.level >= economy.maxLevel ||
		state.coins < tower.level * economy.upgradeCost
	)
		return null;
	return { spend: tower.level * economy.upgradeCost, refund: 0 };
}
export function canRelocate(
	state: ConstructionState,
	from: number,
	to: number,
): boolean {
	const source = state.towers.find((t) => t.slot === from);
	const destination = state.towers.find((t) => t.slot === to);
	return (
		state.phase === "prepare" &&
		from !== to &&
		!!source &&
		isConstructionSite(state.map, to, source.kind) &&
		(!destination || isConstructionSite(state.map, from, destination.kind))
	);
}
