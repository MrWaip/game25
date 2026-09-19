import { enemyDefinitions } from "@/games/defense/definitions/enemies";
import type { World } from "@/core/world";
import type { ISystem } from "@/systems/system";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { Run } from "@/games/defense/components/runComponent";
export class EnemySupportSystem implements ISystem {
	fixedUpdate(world: World, dt: number): void {
		if (world.getFirstComponent(Run)!.phase !== "wave") return;
		for (const {
			components: [enemy],
		} of world.query(Enemy)) {
			const refresh = enemyDefinitions[enemy.kind].shieldRefresh;
			if (!refresh) continue;
			enemy.shieldTimer = Math.max(0, enemy.shieldTimer - dt);
			if (enemy.shieldTimer === 0) {
				enemy.shield = refresh.charges;
				enemy.shieldTimer = refresh.interval;
			}
		}
	}
}
