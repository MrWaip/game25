import type { World } from "@/core/world";
import type { ISystem } from "@/systems/system";
import { Run } from "@/games/defense/components/runComponent";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { rewardChoices } from "@/games/defense/rewards";
import { economy, milestone, isMilestone } from "@/games/defense/config";
import { shopOffers } from "@/games/defense/shop";
import { buildModifiers } from "@/games/defense/effects/buildModifiers";
import { signal } from "@/games/defense/combatTriggers";
export class WaveSystem implements ISystem {
	fixedUpdate(world: World): void {
		const run = world.getFirstComponent(Run)!;
		if (run.phase !== "wave") return;
		if (run.remaining === 0 && !world.query(Enemy).next().value) {
			run.coins += economy.waveReward;
			if (run.overdrives === 2 && run.bonuses.reserve) {
				run.coins += buildModifiers(run.bonuses).reserveIncome;
				signal(run, "reserve");
			}
			if (isMilestone(run.wave)) {
				run.coins += milestone.coins;
				run.health = Math.min(10, run.health + milestone.healing);
				run.expansionDue = true;
			}
			run.phase = "reward";
			run.choices = isMilestone(run.wave) ? rewardChoices(run) : [];
			run.shopRoll = 0;
			run.shop = shopOffers(run);
			if (run.heldOffer && !run.shop.includes(run.heldOffer))
				run.shop = [run.heldOffer, ...run.shop.slice(0, 2)];
			run.heldOffer = null;
		}
	}
}
