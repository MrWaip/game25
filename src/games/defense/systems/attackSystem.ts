import { routeLength, slotsFor } from "@/games/defense/board";
import { attackStats, damageReceived } from "@/games/defense/combatRules";
import type { World } from "@/core/world";
import type { ISystem } from "@/systems/system";
import { Run } from "@/games/defense/components/runComponent";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { Tower } from "@/games/defense/components/towerComponent";
import { economy } from "@/games/defense/config";
import { isChilled, attackDelay } from "@/games/defense/worldRules";
import { buildModifiers } from "@/games/defense/effects/buildModifiers";

export class AttackSystem implements ISystem {
	fixedUpdate(world: World, dt: number): void {
		const run = world.getFirstComponent(Run)!;
		if (run.phase !== "wave") return;
		const build = buildModifiers(run.bonuses);
		const slots = slotsFor(run.map);
		for (const {
			components: [tower],
		} of world.query(Tower)) {
			tower.shots = (tower.shots ?? [])
				.map((shot) => ({ ...shot, life: shot.life - dt }))
				.filter((shot) => shot.life > 0);
			tower.cooldown = Math.max(0, tower.cooldown - dt);
			if (tower.cooldown > 0) continue;
			const position = slots[tower.slot],
				stats = attackStats(tower, build);
			const enemies = [...world.query(Enemy)];
			const candidates = enemies
				.filter(
					({ components: [e] }) =>
						Math.hypot(e.x - position.x, e.y - position.y) <= stats.range,
				)
				.sort((a, b) => {
					const first = a.components[0],
						second = b.components[0];
					return (
						routeLength(run.map, first.path) -
						first.progress -
						(routeLength(run.map, second.path) - second.progress)
					);
				});
			if (!candidates.length) continue;
			const target = candidates[0].components[0];
			const splash = stats.attack.shape === "splash";
			const shards =
				tower.kind === "blast" &&
				isChilled(run, target, build) &&
				build.shardDamage > 0;
			const conduction =
				tower.kind === "rapid" && isChilled(run, target, build)
					? build.conductionDamage
					: 0;
			const bursts: Enemy[] = [];
			const hits = splash
				? enemies.filter(
						({ components: [e] }) =>
							Math.hypot(e.x - target.x, e.y - target.y) <= stats.attack.radius,
					)
				: candidates.slice(0, stats.targets);
			tower.shots = hits.map(({ components: [e] }) => ({
				x: e.x,
				y: e.y,
				life: shards ? 0.24 : 0.14,
				effect: shards
					? ("shatter" as const)
					: splash
						? ("blast" as const)
						: ("shot" as const),
			}));
			if (shards) run.shatters++;
			for (const {
				components: [enemy],
			} of hits) {
				const shieldBefore = enemy.shield;
				if (enemy.shield > 0) enemy.shield--;
				else {
					enemy.slow = Math.max(enemy.slow, stats.slow);
					enemy.hp -= damageReceived(
						enemy,
						stats.damage,
						stats.type,
						isChilled(run, enemy, build),
						build,
					);
				}
				// Secondary damage has no on-hit triggers: combinations cannot recurse indefinitely.
				if ((shards || conduction > 0) && enemy.hp > 0) {
					if (enemy.shield > 0) enemy.shield--;
					else
						enemy.hp -= damageReceived(
							enemy,
							shards ? build.shardDamage : conduction,
							"magic",
							isChilled(run, enemy, build),
							build,
						);
				}
				if (
					shieldBefore > 0 &&
					enemy.shield === 0 &&
					build.shieldBurstDamage > 0
				)
					bursts.push(enemy);
			}
			// Secondary explosions cannot trigger another shield explosion.
			for (const source of bursts) {
				tower.shots.push({
					x: source.x,
					y: source.y,
					life: 0.24,
					effect: "shatter",
				});
				for (const {
					components: [enemy],
				} of enemies) {
					if (
						enemy.hp <= 0 ||
						Math.hypot(enemy.x - source.x, enemy.y - source.y) > 65
					)
						continue;
					if (enemy.shield > 0) enemy.shield--;
					else
						enemy.hp -= damageReceived(
							enemy,
							build.shieldBurstDamage,
							"magic",
							isChilled(run, enemy, build),
							build,
						);
				}
			}
			for (const {
				entity,
				components: [enemy],
			} of enemies) {
				if (enemy.hp <= 0) {
					if (build.deathSlow > 0 && isChilled(run, enemy, build)) {
						for (const {
							components: [nearby],
						} of enemies)
							if (
								nearby.hp > 0 &&
								Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) <= 80
							)
								nearby.slow = Math.max(nearby.slow, build.deathSlow);
					}
					world.deleteEntity(entity);
					run.coins += economy.killReward;
					run.kills++;
					run.waveKills++;
				}
			}
			tower.cooldown = stats.interval * attackDelay(run, position, build);
		}
	}
}
