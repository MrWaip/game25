import type { World } from "@/core/world";
import type { ISystem } from "@/systems/system";
import { Run } from "@/games/defense/components/runComponent";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { pointOnRoute, routeLength } from "@/games/defense/board";
import {
	movementFactor,
	tickWorld,
	crossWorld,
} from "@/games/defense/worldRules";
import { buildModifiers } from "@/games/defense/effects/buildModifiers";
import { enemyDefinitions } from "@/games/defense/definitions/enemies";
import { speedAuraMultiplier } from "@/games/defense/enemyRules";
export class EnemyMovementSystem implements ISystem {
	fixedUpdate(world: World, dt: number): void {
		const run = world.getFirstComponent(Run)!;
		if (run.phase !== "wave") return;
		run.elapsed += dt;
		if (run.elapsedSeconds !== null) run.elapsedSeconds += dt;
		tickWorld(run, dt);
		const build = buildModifiers(run.bonuses);
		const enemies = [...world.query(Enemy)];
		// Compute from a single instant; movement order must not change aura coverage.
		const speeds = enemies.map(
			({ components: [enemy] }) =>
				movementFactor(run, enemy, build) *
				speedAuraMultiplier(
					enemy,
					enemies.map((e) => e.components[0]),
				),
		);
		for (const [
			index,
			{
				entity,
				components: [enemy],
			},
		] of enemies.entries()) {
			enemy.slow = Math.max(0, enemy.slow - dt);
			const before = enemy.progress;
			enemy.progress += enemy.speed * speeds[index] * dt;
			crossWorld(run, enemy, before, build);
			Object.assign(enemy, pointOnRoute(run.map, enemy.progress, enemy.path));
			if (enemy.progress >= routeLength(run.map, enemy.path)) {
				world.deleteEntity(entity);
				run.health = Math.max(
					0,
					run.health - enemyDefinitions[enemy.kind].breachDamage,
				);
				run.waveLeaks++;
			}
		}
		if (run.health <= 0) run.phase = "lost";
	}
}
