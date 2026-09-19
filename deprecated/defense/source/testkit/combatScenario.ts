import { onTestFinished } from "vite-plus/test";
import { createDefenseWorld } from "@/games/defense/setup";
import { createSessionRuntime } from "@/games/defense/sessionRuntime";
import { Run } from "@/games/defense/components/runComponent";
import type { Enemy } from "@/games/defense/components/enemyComponent";
import type { Tower } from "@/games/defense/components/towerComponent";
import type { Upgrade } from "@/games/defense/config";
import { createEnemy } from "@/games/defense/entities/enemy";
import { createTower } from "@/games/defense/entities/tower";
import {
	classicMap,
	pointOnRoute,
	type DefenseMap,
} from "@/games/defense/board";

type EnemyFixture = Partial<
	Pick<
		Enemy,
		| "kind"
		| "path"
		| "hp"
		| "maxHp"
		| "speed"
		| "progress"
		| "slow"
		| "teleported"
		| "shield"
		| "shieldTimer"
	>
>;
type TowerFixture = Pick<Tower, "slot" | "kind"> &
	Partial<Pick<Tower, "level" | "cooldown">>;

/** A first-wave fight with no new spawns for 100 seconds. Enemies default to
 * 100 HP, speed 50 and route progress 206; positions follow route progress.
 * Uses the real session runtime, with cleanup even when an assertion fails.
 */
export async function createCombatScenario(
	options: {
		map?: DefenseMap;
		towers?: TowerFixture[];
		enemies?: EnemyFixture[];
		bonuses?: Partial<Record<Upgrade, number>>;
		snow?: number;
	} = {},
) {
	const assembly = await createDefenseWorld(
		"42",
		structuredClone(options.map ?? classicMap),
	);
	try {
		const run = assembly.world.getFirstComponent(Run)!;
		run.phase = "wave";
		run.wave = 1;
		run.remaining = 1;
		run.spawnIn = 100;
		Object.assign(run.bonuses, options.bonuses);
		run.snow = options.snow ?? null;
		for (const fixture of options.towers ?? []) {
			const [tower] = createTower(fixture.slot, fixture.kind);
			Object.assign(tower, fixture);
			assembly.world.addEntity([tower]);
		}
		for (const fixture of options.enemies ?? []) {
			const [enemy] = createEnemy(fixture.kind ?? "normal", run.wave, run.map);
			Object.assign(
				enemy,
				{ hp: 100, maxHp: 100, speed: 50, progress: 206 },
				fixture,
			);
			Object.assign(enemy, pointOnRoute(run.map, enemy.progress, enemy.path));
			assembly.world.addEntity([enemy]);
		}
		const session = createSessionRuntime(assembly);
		onTestFinished(() => session.destroy());
		return session;
	} catch (error) {
		await assembly.world.destroy();
		throw error;
	}
}
