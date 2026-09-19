import { Random } from "@/primitives/random";
import type { Run } from "./components/runComponent";
import type { RelicId, RelicRarity } from "./model";
import { relics, rarityWeights } from "./definitions/relics";
import { balance } from "./config";
export function rewardOffers(run: Run): RelicId[] {
	const pool = Object.values(relics).filter(
		(relic) => relic.offered !== false && !run.relics.includes(relic.id),
	);
	const random = new Random(`${run.seed}:reward:${run.wave}`);
	const offers: RelicId[] = [];
	while (offers.length < balance.offerCount) {
		const left = pool.filter((relic) => !offers.includes(relic.id));
		if (!left.length) break;
		const weights = left.map(
			(relic) =>
				rarityWeights[relic.rarity](run.wave) / countOf(left, relic.rarity),
		);
		const total = weights.reduce((sum, weight) => sum + weight, 0);
		if (total <= 0) break;
		let roll = random.range(0, total);
		const picked =
			left.find((_, index) => (roll -= weights[index]) <= 0) ?? left[0];
		offers.push(picked.id);
	}
	return offers;
}
function countOf(pool: { rarity: RelicRarity }[], rarity: RelicRarity): number {
	return pool.filter((relic) => relic.rarity === rarity).length;
}
