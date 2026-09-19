import {
	pointOnRoute,
	routeLength,
	type DefenseMap,
} from "@/games/defense/board";
import { waveDifficulty } from "@/games/defense/waves";
import { Enemy } from "@/games/defense/components/enemyComponent";
import {
	enemyDefinitions,
	type EnemyKind,
} from "@/games/defense/definitions/enemies";
export function createEnemy(
	kind: EnemyKind,
	wave: number,
	map: DefenseMap,
	path = 0,
): [Enemy] {
	const stats = enemyDefinitions[kind];
	const difficulty = waveDifficulty(wave);
	const enemy = new Enemy(
		Math.round(stats.hp * difficulty.health),
		stats.speed * difficulty.speed * Math.max(1, routeLength(map, path) / 1530),
		kind,
	);
	enemy.shield = stats.shield;
	enemy.shieldTimer = stats.shieldRefresh?.interval ?? 0;
	enemy.path = path;
	Object.assign(enemy, pointOnRoute(map, 0, path));
	return [enemy];
}
