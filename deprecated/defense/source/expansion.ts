import {
	slotsFor,
	isBuildable,
	distanceToRoad,
	type DefenseMap,
} from "@/games/defense/board";

export const expansion = {
	initialLimit: 4,
	maxLimit: 12,
};

/** Compatibility projection for saves and snapshots: every nearby cell is open. */
export function foundations(map: DefenseMap): number[] {
	return slotsFor(map)
		.map((_, i) => i)
		.filter((i) => isBuildable(map, i) && distanceToRoad(map, i) <= 96);
}
