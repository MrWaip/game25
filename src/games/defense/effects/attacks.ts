import { withinRadius } from "@/primitives/spatial";
import { damageEnemy } from "./damage";
import { ignite } from "./burning";
import type { AttackEffect, EnemyState } from "../model";
import type { Run } from "../components/runComponent";
import { pointOnRoad } from "../board";
import { enemies } from "../definitions/enemies";
import { activeRelics, oilFactor } from "./relicEffects";
import { balance } from "../config";

type EffectHandlers = {
	[K in AttackEffect["type"]]: (
		effect: Extract<AttackEffect, { type: K }>,
		target: EnemyState,
		run: Run,
	) => void;
};
const handlers: EffectHandlers = {
	damage(effect, target, run) {
		damageEnemy(target, effect.amount, run);
	},
	oil(effect, target, run) {
		const center = pointOnRoad(target.distance, run.level);
		for (const enemy of withinRadius(
			run.enemies,
			center,
			effect.radius,
			(enemy) => pointOnRoad(enemy.distance, run.level),
		)) {
			// Acid clings to armour that plain oil slides off, but never slows it.
			const definition = enemies[enemy.kind];
			const reachable =
				definition.hover === 0 || activeRelics(run.relics).includes("bridge");
			const burnable = definition.oilable || definition.hover > 0;
			const coatable = burnable || !!effect.acid;
			if (enemy.hp > 0 && coatable && reachable) {
				const wet = enemy.oil > 0;
				enemy.layers = wet ? Math.min(balance.oilLayers, enemy.layers + 1) : 1;
				const thickness = 1 + (enemy.layers - 1) * 0.25;
				enemy.oil = effect.duration * oilFactor(run.relics) * thickness;
				enemy.slow = burnable ? Math.min(0.8, effect.slow * thickness) : 0;
				enemy.acid = Math.max(wet ? enemy.acid : 0, effect.acid ?? 0);
				enemy.vulnerability = Math.max(
					wet ? enemy.vulnerability : 1,
					effect.vulnerability ?? 1,
				);
			}
		}
	},
	ignite(_effect, target, run) {
		if (ignite(target, run.relics)) run.ignites++;
	},
};
export function applyAttack(
	effect: AttackEffect,
	target: EnemyState,
	run: Run,
) {
	switch (effect.type) {
		case "damage":
			return handlers.damage(effect, target, run);
		case "oil":
			return handlers.oil(effect, target, run);
		case "ignite":
			return handlers.ignite(effect, target, run);
	}
}
