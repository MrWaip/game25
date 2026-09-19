import type { World } from "@/core/world";
import { Run } from "@/games/defense/components/runComponent";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { Tower } from "@/games/defense/components/towerComponent";

export function snapshot(world: World) {
	const run = world.getFirstComponent(Run)!;
	return {
		...structuredClone(run),
		towers: [...world.query(Tower)].map(({ components: [tower] }) =>
			structuredClone(tower),
		),
		enemies: [...world.query(Enemy)].map(({ components: [enemy] }) =>
			structuredClone(enemy),
		),
	};
}
export type DefenseSnapshot = ReturnType<typeof snapshot>;
