import { withinRadius } from "@/primitives/spatial";
import { pointOnRoad } from "../board";
import type { EnemyState, RelicId } from "../model";
import { burning } from "../definitions/effects";
import { enemies as definitions } from "../definitions/enemies";
import { activeRelics, burnFactor } from "./relicEffects";
function burnable(enemy: EnemyState): boolean {
	const definition = definitions[enemy.kind];
	return definition.oilable || definition.hover > 0;
}
export function ignite(enemy: EnemyState, relics: RelicId[]): boolean {
	if (!burnable(enemy) || enemy.oil <= 0 || enemy.hp <= 0) return false;
	enemy.burn = activeRelics(relics).includes("tinder")
		? Infinity
		: burning.duration;
	const layers = Math.max(1, enemy.layers);
	enemy.burnStacks = Math.min(
		burning.stackLimit,
		activeRelics(relics).includes("stacks")
			? Math.max(layers, enemy.burnStacks + 1)
			: layers,
	);
	return true;
}
export function tickBurning(
	enemies: EnemyState[],
	relics: RelicId[],
	dt: number,
	level: number,
): number {
	let ignitions = 0;
	const factor = burnFactor(relics);
	if (activeRelics(relics).includes("chain")) {
		// Only already burning sources spread this tick; a chain advances over time.
		const sources = enemies.filter((e) => e.hp > 0 && e.burn > 0);
		for (const source of sources) {
			source.spreadIn -= dt;
			if (source.spreadIn > 0) continue;
			source.spreadIn = burning.spreadInterval;
			const a = pointOnRoad(source.distance, level);
			for (const target of withinRadius(
				enemies,
				a,
				burning.spreadRadius,
				(enemy) => pointOnRoad(enemy.distance, level),
			)) {
				if (target === source || target.burn > 0) continue;
				if (ignite(target, relics)) ignitions++;
			}
		}
	}
	for (const enemy of enemies) {
		if (!burnable(enemy) || enemy.burn <= 0) continue;
		enemy.hp -=
			burning.damagePerSecond *
			factor *
			enemy.burnStacks *
			Math.min(dt, enemy.burn);
		if (enemy.burn !== Infinity) enemy.burn = Math.max(0, enemy.burn - dt);
		if (enemy.burn === 0) enemy.burnStacks = 0;
	}
	return ignitions;
}
