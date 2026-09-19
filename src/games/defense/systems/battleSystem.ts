import {
	flightTime,
	projectileKind,
	shotLifetime,
} from "../definitions/projectiles";
import { waveDefinition, waveSpawn } from "../definitions/campaign";
import { enemies } from "../definitions/enemies";
import { withinRadius } from "@/primitives/spatial";
import { selectTarget } from "../definitions/targetPriorities";
import { damageEnemy } from "../effects/damage";
import { rewardOffers } from "../rewards";
import { tickBurning } from "../effects/burning";
import { towerAttack } from "../definitions/towers";
import { applyAttack } from "../effects/attacks";
import type { Attack, EnemyState, TowerKind } from "../model";
import type { ISystem } from "@/systems/system";
import type { World } from "@/core/world";
import { Run } from "../components/runComponent";
import { balance } from "../config";
import { underConstruction } from "../builders";
import { castleWall, pathLengthFor, pointOnRoad, sitesFor } from "../board";
import {
	activeRelics,
	damageFactor,
	towerDamage,
	rateFactor,
	stunBonus,
	waveEndCoins,
} from "../effects/relicEffects";
function mostWounded(
	candidates: EnemyState[],
	kind: TowerKind,
	overrides: Attack["targets"],
): EnemyState | undefined {
	const allowed = candidates.filter(
		(enemy) => selectTarget(kind, [enemy], overrides) === enemy,
	);
	return allowed.sort((a, b) => a.hp - b.hp)[0];
}
function piggyBanks(relics: readonly string[]): number {
	return relics.filter((relic) => relic === "piggy").length;
}
export class BattleSystem implements ISystem {
	fixedUpdate(world: World, dt: number) {
		const run = world.getFirstComponent(Run)!;
		if (run.phase === "falling") {
			run.fallTime += dt;
			const end = pathLengthFor(run.level);
			for (const enemy of run.enemies)
				enemy.distance += Math.max(500, end / 1.5) * dt;
			run.enemies = run.enemies.filter((e) => e.distance < end);
			if (run.fallTime >= 2) run.phase = "lost";
			return;
		}
		if (run.phase === "wave" || run.phase === "prepare") {
			for (const tower of underConstruction(run.towers)) {
				if (tower.construction - dt <= 1e-9) {
					tower.construction = 0;
					tower.constructionKind = null;
				} else tower.construction -= dt;
			}
		}
		if (run.phase !== "wave") {
			for (const shot of run.shots) {
				shot.age += dt;
				delete shot.impact;
			}
			run.shots = run.shots.filter(
				(shot) => shot.age < shotLifetime(shot.sprite),
			);
			return;
		}
		run.elapsedSeconds += dt;
		for (const shot of run.shots) {
			shot.age += dt;
			const impact = shot.impact;
			if (!impact) continue;
			const target = run.enemies.find(
				(enemy) => enemy.id === impact.targetId && enemy.hp > 0,
			);
			if (target) shot.to = pointOnRoad(target.distance, run.level);
			if (shot.age >= flightTime(shot.sprite)) {
				if (impact.splash) {
					const victims = [
						...withinRadius(
							run.enemies,
							shot.to,
							impact.splash.radius,
							(enemy) => pointOnRoad(enemy.distance, run.level),
						),
					];
					for (const enemy of victims) {
						// Splash bursts on the road and cannot reach an airborne enemy.
						if (
							enemies[enemy.kind].hover > 0 &&
							!activeRelics(run.relics).includes("bridge")
						)
							continue;
						damageEnemy(
							enemy,
							impact.damage *
								(enemy.kind === "shieldSquad"
									? impact.splash.shieldMultiplier
									: 1),
							run,
						);
						if (impact.stun) enemy.stun = impact.stun;
					}
					if (target) shot.hitTargetId = target.id;
				} else if (target) {
					shot.hitTargetId = target.id;
					applyAttack({ type: "damage", amount: impact.damage }, target, run);
					if (impact.ignite) applyAttack({ type: "ignite" }, target, run);
					if (impact.stun) target.stun = impact.stun;
					if (impact.ricochet) {
						const ricochet = impact.ricochet;
						const neighbours = [
							...withinRadius(run.enemies, shot.to, ricochet.radius, (enemy) =>
								pointOnRoad(enemy.distance, run.level),
							),
						]
							.filter((enemy) => enemy !== target && enemy.hp > 0)
							.sort(
								(a, b) =>
									Math.abs(b.distance - target.distance) -
									Math.abs(a.distance - target.distance),
							)
							.slice(-ricochet.targets);
						// Each bounce is its own arrow: the hop has to be visible.
						let origin = shot.to;
						for (const enemy of neighbours) {
							const landing = pointOnRoad(enemy.distance, run.level);
							run.shots.push({
								from: origin,
								to: landing,
								sprite: shot.sprite,
								fire: shot.fire,
								age: 0,
								impact: {
									targetId: enemy.id,
									damage: impact.damage * ricochet.factor,
									ignite: impact.ignite,
								},
							});
							origin = landing;
						}
					}
				}
				delete shot.impact;
			}
		}
		run.shots = run.shots.filter(
			(shot) => shot.age < shotLifetime(shot.sprite),
		);
		const wave = waveDefinition(run.wave);
		const spawn = waveSpawn(wave, wave.count - run.remaining);
		const spawnKind = spawn?.kind ?? "goblin";
		run.spawnIn -= dt;
		if (
			run.remaining &&
			spawn &&
			run.spawnIn <= 0 &&
			run.enemies.every((enemy) => enemy.distance >= enemies[spawnKind].spacing)
		) {
			run.enemies.push({
				id: run.nextId++,
				kind: spawnKind,
				memberHp: spawnKind === "shieldSquad" ? spawn.health : undefined,
				burn: 0,
				burnStacks: 0,
				spreadIn: 0,
				distance: 0,
				hp: spawnKind === "shieldSquad" ? spawn.shieldHealth : spawn.health,
				maxHp: spawnKind === "shieldSquad" ? spawn.shieldHealth : spawn.health,
				oil: 0,
				layers: 0,
				slow: 0,
				acid: 0,
				vulnerability: 1,
				stun: 0,
			});
			run.remaining--;
			run.spawnIn = waveSpawn(wave, wave.count - run.remaining)?.delay ?? 0;
		}
		const sites = sitesFor(run.level);
		const relics = activeRelics(run.relics);
		const gate = pointOnRoad(pathLengthFor(run.level), run.level);
		for (const tower of run.towers) {
			if (tower.rushed > 0) tower.rushed = Math.max(0, tower.rushed - dt);
			if (tower.construction > 0) continue;
			tower.cooldown -= dt;
			if (tower.cooldown > 0) continue;
			const attack = towerAttack(tower.kind, tower.level, tower.specialization);
			const position = sites[tower.slot];
			const reachable = [
				...withinRadius(run.enemies, position, attack.range, (enemy) =>
					pointOnRoad(enemy.distance, run.level),
				),
			];
			const overrides = relics.includes("bridge")
				? { flyer: 1, ...attack.targets }
				: attack.targets;
			const target = relics.includes("mark")
				? mostWounded(reachable, tower.kind, overrides)
				: selectTarget(tower.kind, reachable, overrides);
			if (!target) continue;
			tower.shots++;
			const stunning =
				attack.stun && tower.shots % attack.stun.everyNth === 0
					? attack.stun.duration + stunBonus(run.relics)
					: undefined;
			const damage =
				towerDamage(
					run,
					tower.kind,
					attack.effects.reduce(
						(sum, effect) =>
							sum + (effect.type === "damage" ? effect.amount : 0),
						0,
					),
				) * damageFactor(run, tower, sites, gate);
			const projectile = projectileKind(attack.projectile);
			const shot = {
				from: position,
				to: pointOnRoad(target.distance, run.level),
				sprite: attack.projectile,
				fire: attack.effects.some((effect) => effect.type === "ignite"),
				age: 0,
				impact:
					projectile === "arrow" || projectile === "stone"
						? {
								targetId: target.id,
								splash: attack.splash,
								ricochet: attack.ricochet,
								stun: stunning,
								damage,
								ignite: attack.effects.some(
									(effect) => effect.type === "ignite",
								),
							}
						: undefined,
			};
			run.shots.push(shot);
			const echoed = relics.includes("echo") && tower.shots % 5 === 0;
			if (echoed) run.shots.push(structuredClone(shot));
			if (projectile === "liquid")
				for (const effect of attack.effects) {
					applyAttack(effect, target, run);
					if (echoed) applyAttack(effect, target, run);
				}
			tower.cooldown = attack.interval / rateFactor(run, tower);
		}
		for (const enemy of run.enemies) {
			if (enemy.stun > 0) enemy.stun = Math.max(0, enemy.stun - dt);
			if (enemy.oil > 0 && enemy.acid > 0)
				enemy.hp -= enemy.acid * Math.min(dt, enemy.oil);
		}
		run.ignites += tickBurning(run.enemies, run.relics, dt, run.level);
		if (run.ignites >= 50 && run.relics.includes("tinder"))
			run.relics = run.relics.map((relic) =>
				relic === "tinder" ? "ash" : relic,
			);
		const fallen = run.enemies.filter((e) => e.hp <= 0);
		run.kills += fallen.length;
		run.flyerKills += fallen.filter((e) => e.kind === "flyer").length;
		run.stunKills += fallen.filter((e) => e.stun > 0).length;
		run.coins += fallen.length * wave.bounty;
		run.coinsEarned += fallen.length * wave.bounty;
		run.enemies = run.enemies.filter((e) => e.hp > 0);
		for (const enemy of run.enemies) {
			if (enemy.stun <= 0)
				enemy.distance +=
					enemies[enemy.kind].speed * dt * (enemy.oil > 0 ? 1 - enemy.slow : 1);
			enemy.oil = Math.max(0, enemy.oil - dt);
			if (enemy.oil === 0) {
				enemy.layers = 0;
				enemy.acid = 0;
				enemy.vulnerability = 1;
			}
		}
		const leaks = run.enemies.filter(
			(e) => e.distance >= pathLengthFor(run.level),
		);
		const breach = leaks.reduce(
			(damage, e) => damage + enemies[e.kind].breachDamage,
			0,
		);
		run.health = Math.max(0, run.health - breach);
		for (const leak of leaks)
			run.shots.push({
				from: castleWall,
				to: castleWall,
				sprite: "breach",
				fire: false,
				age: 0,
				hitTargetId: leak.id,
			});
		if (breach > 0) {
			if (relics.includes("greed"))
				run.coins = Math.floor(run.coins * (1 - balance.greedBreachLoss));
			run.relics = run.relics.filter((relic) => relic !== "vial");
			if (run.health === 0 && relics.includes("bones")) {
				run.health = 1;
				run.relics = run.relics.filter((relic) => relic !== "bones");
			}
		}
		run.enemies = run.enemies.filter(
			(e) => e.distance < pathLengthFor(run.level),
		);
		if (run.health === 0) run.phase = "falling";
		else if (!run.remaining && !run.enemies.length) {
			run.phase = "reward";
			run.completedWaves = run.wave;
			const interest = waveEndCoins(run);
			run.coins += interest;
			run.coinsEarned += interest;
			if (relics.includes("piggy")) run.piggyCoins += 3 * piggyBanks(relics);
			run.offers = rewardOffers(run);
		}
	}
}
