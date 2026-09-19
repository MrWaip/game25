import type { Run } from "@/games/defense/components/runComponent";
import type { Enemy } from "@/games/defense/components/enemyComponent";
import type { BuildModifiers } from "@/games/defense/effects/buildModifiers";
import type { Point, WorldEffect } from "@/games/defense/effects/worldEffect";
import { snowEffect } from "@/games/defense/effects/snow";
import { portalEffect } from "@/games/defense/effects/portal";

const effects: readonly WorldEffect[] = [snowEffect, portalEffect];
export function tickWorld(run: Run, dt: number): void {
	for (const effect of effects) effect.tick?.(run, dt);
}
export function crossWorld(
	run: Run,
	enemy: Enemy,
	before: number,
	build: BuildModifiers,
): void {
	for (const effect of effects) effect.crossing?.(run, enemy, before, build);
}
export function isChilled(
	run: Run,
	enemy: Enemy,
	build: BuildModifiers,
): boolean {
	return (
		enemy.slow > 0 ||
		effects.some((effect) => effect.chills?.(run, enemy, build))
	);
}
export function movementFactor(
	run: Run,
	enemy: Enemy,
	build: BuildModifiers,
): number {
	return effects.reduce(
		(factor, effect) =>
			Math.min(factor, effect.movementFactor?.(run, enemy, build) ?? 1),
		enemy.slow > 0 ? 0.5 : 1,
	);
}
export function attackDelay(
	run: Run,
	position: Point,
	build: BuildModifiers,
): number {
	return effects.reduce(
		(factor, effect) =>
			factor * (effect.attackDelay?.(run, position, build) ?? 1),
		1,
	);
}
