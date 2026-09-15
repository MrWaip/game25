import type { World } from "@/core/world";
import { Run } from "@/games/defense/components/runComponent";
import { Tower } from "@/games/defense/components/towerComponent";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { savedState, savedTower, savedEnemy, type SavedRun } from "./state";
import { decodeSave, saveVersion } from "./validation";

export { InvalidSaveError } from "./validation";

export function save(world: World): string {
	const state: SavedRun = {
		...savedState(world.getFirstComponent(Run)!),
		towers: [...world.query(Tower)].map(({ components: [tower] }) =>
			savedTower(tower),
		),
		enemies: [...world.query(Enemy)].map(({ components: [enemy] }) =>
			savedEnemy(enemy),
		),
	};
	return JSON.stringify({ version: saveVersion, state });
}

/** Restore into the fresh world created by the session. Never assign raw input. */
export function restore(world: World, serialized: string): void {
	const state = decodeSave(serialized);
	Object.assign(world.getFirstComponent(Run)!, savedState(state));
	for (const tower of state.towers) {
		world.addEntity([
			Object.assign(new Tower(tower.slot, tower.kind), savedTower(tower)),
		]);
	}
	for (const enemy of state.enemies) {
		world.addEntity([
			Object.assign(
				new Enemy(enemy.hp, enemy.speed, enemy.kind),
				savedEnemy(enemy),
			),
		]);
	}
}
