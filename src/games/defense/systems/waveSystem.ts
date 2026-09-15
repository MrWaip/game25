import type { World } from "@/core/world";
import type { ISystem } from "@/systems/system";
import { Run } from "@/games/defense/components/runComponent";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { rewardChoices } from "@/games/defense/rewards";
import { economy, milestone, isMilestone } from "@/games/defense/config";
export class WaveSystem implements ISystem {
	fixedUpdate(world: World): void {
		const run = world.getFirstComponent(Run)!;
		if (run.phase !== "wave") return;
		if (run.remaining === 0 && !world.query(Enemy).next().value) {
			run.coins += economy.waveReward;
			if (isMilestone(run.wave)) {
				run.coins += milestone.coins;
				run.health = Math.min(10, run.health + milestone.healing);
			}
			run.phase = "reward";
			run.choices = rewardChoices(run);
		}
	}
}
