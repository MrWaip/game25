import { slotsFor } from "@/games/defense/board";
import type { Run } from "@/games/defense/components/runComponent";
import type { BuildModifiers } from "@/games/defense/effects/buildModifiers";
import type { WorldEffect, Point } from "@/games/defense/effects/worldEffect";
export const snowRules = {
	radius: 76,
	enemySpeed: 0.6,
	weaponDelay: 1.25,
} as const;
export const snowRadius = (build: BuildModifiers) =>
	snowRules.radius + build.snowRadiusBonus;
export function inSnow(
	run: Pick<Run, "snow" | "map">,
	position: Point,
	build: BuildModifiers,
): boolean {
	if (run.snow === null) return false;
	const center = slotsFor(run.map)[run.snow];
	return (
		Math.hypot(position.x - center.x, position.y - center.y) <=
		snowRadius(build)
	);
}
export const snowEffect: WorldEffect = {
	chills: inSnow,
	movementFactor: (run, position, build) =>
		inSnow(run, position, build) ? snowRules.enemySpeed : 1,
	attackDelay: (run, position, build) =>
		inSnow(run, position, build) && !build.snowAdaptation
			? snowRules.weaponDelay
			: 1,
};
