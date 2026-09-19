import { Random } from "@/primitives/random";
import { upgrades, type Upgrade } from "@/games/defense/definitions/upgrades";
import type { Run } from "@/games/defense/components/runComponent";
import { eligibleReward } from "@/games/defense/rewards";
import { connectedUpgrades } from "@/games/defense/synergyRules";

export const jokerSlots = 6;
export function ownedJokers(bonuses: Record<Upgrade, number>): Upgrade[] {
	return (Object.keys(upgrades) as Upgrade[]).filter((key) => bonuses[key] > 0);
}
export function jokerPrice(key: Upgrade, rank: number): number {
	return (upgrades[key].category === "МИР" ? 45 : 30) + rank * 20;
}
export const rerollPrice = (count: number) => 8 + count * 4;
export function shopOffers(
	run: Pick<Run, "seed" | "wave" | "shopRoll" | "bonuses">,
): Upgrade[] {
	const random = new Random(`${run.seed}:shop:${run.wave}:${run.shopRoll}`);
	const pool = (Object.keys(upgrades) as Upgrade[]).filter((key) =>
		eligibleReward(run.bonuses, key),
	);
	const offers: Upgrade[] = [];
	const continuations = pool.filter(
		(key) =>
			run.bonuses[key] === 0 && connectedUpgrades(run.bonuses, key).length > 0,
	);
	if (continuations.length) {
		const choice = continuations[random.int(0, continuations.length - 1)];
		offers.push(choice);
		pool.splice(pool.indexOf(choice), 1);
	}
	while (pool.length && offers.length < 3)
		offers.push(pool.splice(random.int(0, pool.length - 1), 1)[0]);
	return offers;
}
