import { upgrades } from "@/games/defense/definitions/upgrades";
import type { Run } from "@/games/defense/components/runComponent";
import type { Upgrade } from "@/games/defense/config";
import { eligibleReward } from "@/games/defense/rewards";
import {
	jokerPrice,
	jokerSlots,
	ownedJokers,
	rerollPrice,
	shopOffers,
} from "@/games/defense/shop";

export function buyOffer(
	run: Run,
	key: Upgrade,
	grant: (upgrade: Upgrade) => void,
): boolean {
	if (
		run.phase !== "prepare" ||
		!run.shop.includes(key) ||
		!eligibleReward(run.bonuses, key) ||
		(!run.bonuses[key] && ownedJokers(run.bonuses).length >= jokerSlots)
	)
		return false;
	const price = jokerPrice(key, run.bonuses[key]);
	if (run.coins < price || run.pendingWorld) return false;
	run.coins -= price;
	run.shop = run.shop.filter((offer) => offer !== key);
	if (run.heldOffer === key) run.heldOffer = null;
	grant(key);
	return true;
}

export function sellJoker(run: Run, key: Upgrade): boolean {
	if (
		!["prepare", "reward"].includes(run.phase) ||
		!Object.hasOwn(upgrades, key) ||
		!run.bonuses[key]
	)
		return false;
	run.coins += Math.floor(jokerPrice(key, run.bonuses[key] - 1) / 2);
	run.bonuses[key] = 0;
	if (key === "soulHarvest") run.harvestKills = 0;
	if (key === "snowfall") {
		run.snow = null;
		if (run.pendingWorld === "snow") run.pendingWorld = null;
	}
	if (key === "portal") {
		run.portal = null;
		if (run.pendingWorld === "portal") run.pendingWorld = null;
	}
	return true;
}

export function rerollShop(run: Run): boolean {
	const price = rerollPrice(run.shopRoll);
	if (run.phase !== "prepare" || run.coins < price) return false;
	run.coins -= price;
	run.shopRoll++;
	run.shop = shopOffers(run);
	if (run.heldOffer && !run.shop.includes(run.heldOffer))
		run.shop = [run.heldOffer, ...run.shop.slice(0, 2)];
	return true;
}

export function holdOffer(run: Run, key: Upgrade): boolean {
	if (run.phase !== "prepare" || !run.shop.includes(key)) return false;
	run.heldOffer = run.heldOffer === key ? null : key;
	return true;
}
