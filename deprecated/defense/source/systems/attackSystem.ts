import {
	hitReactions,
	deathReactions,
	signal,
} from "@/games/defense/combatTriggers";
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
		const towers = [...world.query(Tower)].map(
			({ components: [tower] }) => tower,
		);
		for (const {
			components: [tower],
		} of world.query(Tower)) {
			tower.shots = (tower.shots ?? [])
				.map((shot) => ({ ...shot, life: shot.life - dt }))
				.filter((shot) => shot.life > 0);
			tower.overdrive = Math.max(0, tower.overdrive - dt);
			tower.cooldown = Math.max(0, tower.cooldown - dt);
			if (tower.kind === "amplifier") continue;
			if (tower.cooldown > 0) continue;
			const position = slots[tower.slot],
				stats = attackStats(tower, build);
			const aura = towers.reduce((rate, source) => {
				const p = slots[source.slot];
				return source.kind === "amplifier" &&
					Math.hypot(p.x - position.x, p.y - position.y) <=
						(source.specialization === "spread" ? 158 : 110)
					? Math.max(
							rate,
							1.35 +
								(source.level - 1) * 0.15 +
								(source.specialization === "focus" ? 0.35 : 0),
						)
					: rate;
			}, 1);
			const alone = !towers.some(
				(other) =>
					other !== tower &&
					Math.hypot(
						slots[other.slot].x - position.x,
						slots[other.slot].y - position.y,
					) <= 100,
			);
			const multiplier =
				(1 + (alone ? build.solitudeBonus : 0)) *
				(1 + (aura > 1 ? build.auraDamageBonus : 0)) *
				(1 + Math.floor(run.harvestKills / 10) * 0.05 * build.harvestGrowth);
			stats.damage *= multiplier;
			const enemies = [...world.query(Enemy)];
			const candidates = enemies
				.filter(
					({ components: [e] }) =>
						Math.hypot(e.x - position.x, e.y - position.y) <= stats.range,
				)
				.sort((a, b) => {
					const first = a.components[0],
						second = b.components[0];
					const priority = (enemy: Enemy) =>
						tower.priority === "shield"
							? enemy.shield
							: tower.priority === "strong"
								? enemy.hp
								: tower.priority === "support"
									? Number(enemy.kind === "herald")
									: 0;
					const difference = priority(second) - priority(first);
					if (difference) return difference;
					return (
						routeLength(run.map, first.path) -
						first.progress -
						(routeLength(run.map, second.path) - second.progress)
					);
				});
			if (!candidates.length) continue;
			if (alone && build.solitudeBonus > 0) signal(run, "solitude");
			if (aura > 1 && build.auraDamageBonus > 0) signal(run, "auraPower");
			const target = candidates[0].components[0];
			if (target.teleported && build.teleportDamageBonus > 0)
				signal(run, "echo");
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
			if (shards) {
				run.shatters++;
				signal(run, "shatter");
			}
			if (conduction > 0) signal(run, "conduction");
			for (const {
				components: [enemy],
			} of hits) {
				const shieldBefore = enemy.shield;
				if (enemy.shield > 0) enemy.shield--;
				else {
					if (tower.kind === "corrode") {
						enemy.corrosion = Math.min(
							0.65,
							enemy.corrosion + (tower.specialization === "focus" ? 0.4 : 0.2),
						);
						enemy.corrosionTime = 4;
					}
					enemy.slow = Math.max(enemy.slow, stats.slow);
					enemy.hp -= damageReceived(
						enemy,
						stats.damage *
							(enemy.lastDamage && enemy.lastDamage !== stats.type
								? 1 + build.crossfireBonus
								: 1),
						stats.type,
						isChilled(run, enemy, build),
						build,
					);
				}
				if (
					enemy.lastDamage &&
					enemy.lastDamage !== stats.type &&
					build.crossfireBonus > 0
				) {
					signal(run, "crossfire");
					tower.shots.push({
						x: enemy.x,
						y: enemy.y,
						life: 0.3,
						effect: "crossfire",
					});
				}
				enemy.lastDamage = stats.type;
				hitReactions(
					run,
					build,
					tower,
					enemy,
					enemies.map((e) => e.components[0]),
					stats.damage,
				);
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
				signal(run, "shieldBurst");
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
			const removed = new Set<number>();
			let dying = enemies.filter(({ components: [enemy] }) => enemy.hp <= 0);
			while (dying.length) {
				for (const {
					entity,
					components: [enemy],
				} of dying) {
					removed.add(entity);
					deathReactions(
						run,
						build,
						tower,
						enemy,
						enemies.map((e) => e.components[0]),
					);
					world.deleteEntity(entity);
					run.coins += economy.killReward;
					run.kills++;
					run.waveKills++;
				}
				dying = enemies.filter(
					({ entity, components: [enemy] }) =>
						!removed.has(entity) && enemy.hp <= 0,
				);
			}
			tower.cooldown =
				(stats.interval * attackDelay(run, position, build)) /
				aura /
				(tower.overdrive > 0 ? 2 : 1);
		}
	}
}
