import type { TowerState } from "./model";
import { balance } from "./config";

export function underConstruction(towers: readonly TowerState[]): TowerState[] {
	return towers
		.filter((tower) => tower.construction > 0)
		.sort((a, b) => a.order - b.order)
		.slice(0, balance.builders);
}
export function queued(
	towers: readonly TowerState[],
	tower: TowerState,
): boolean {
	return tower.construction > 0 && !underConstruction(towers).includes(tower);
}
export type BuilderState =
	| { slot: null }
	| { slot: number; progress: number; seconds: number };
export function builderStates(towers: readonly TowerState[]): BuilderState[] {
	const busy = underConstruction(towers);
	return Array.from({ length: balance.builders }, (_, index) => {
		const tower = busy[index];
		if (!tower) return { slot: null };
		return {
			slot: tower.slot,
			progress: 1 - tower.construction / balance.constructionSeconds,
			seconds: Math.ceil(tower.construction),
		};
	});
}
export function queuePosition(
	towers: readonly TowerState[],
	tower: TowerState,
): number {
	if (!queued(towers, tower)) return 0;
	return (
		towers
			.filter((other) => queued(towers, other))
			.sort((a, b) => a.order - b.order)
			.indexOf(tower) + 1
	);
}
