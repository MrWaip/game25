import type { UpgradeDefinition } from "@/games/defense/definitions/upgrades";
import { Random } from "@/primitives/random";
import {
	upgrades,
	starters,
	type Starter,
	type Upgrade,
} from "@/games/defense/config";
import type { Run } from "@/games/defense/components/runComponent";
export function eligibleReward(
	bonuses: Record<Upgrade, number>,
	key: Upgrade,
): boolean {
	const definition: UpgradeDefinition = upgrades[key];
	return (
		bonuses[key] < definition.max &&
		(definition.requires ?? []).every(
			(required) => bonuses[required as Upgrade] > 0,
		)
	);
}
export function rewardChoices(run: Run): Upgrade[] {
	const random = new Random(`${run.seed}:${run.wave}`);
	const pool = (Object.keys(upgrades) as Upgrade[]).filter((key) =>
		eligibleReward(run.bonuses, key),
	);
	const result: Upgrade[] = [];
	// Offer a world-changing option while either world effect is missing.
	const world = pool.filter(
		(key) => (upgrades[key] as UpgradeDefinition).world,
	);
	if (world.length) {
		const choice = world[random.int(0, world.length - 1)];
		result.push(choice);
		pool.splice(pool.indexOf(choice), 1);
	}
	while (result.length < 3 && pool.length)
		result.push(pool.splice(random.int(0, pool.length - 1), 1)[0]);
	return result;
}

/** A separate seed stream keeps the opening draft independent of map and waves. */
export function starterChoices(seed: string): Starter[] {
	const random = new Random(seed).child("starters:1");
	const pool = Object.keys(starters) as Starter[];
	const result: Starter[] = [];
	while (result.length < 3)
		result.push(pool.splice(random.int(0, pool.length - 1), 1)[0]);
	return result;
}
