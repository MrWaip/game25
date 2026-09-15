import { roadProgress, type DefenseMap } from "@/games/defense/board";
import type { WorldEffect } from "@/games/defense/effects/worldEffect";
export const portalRules = { cooldown: 3, minimumDistance: 144 } as const;
export function validPortalPair(
	map: DefenseMap,
	entrance: number,
	exit: number,
): boolean {
	return map.paths.some((_, path) => {
		const end = roadProgress(map, entrance, path),
			start = roadProgress(map, exit, path);
		return (
			end !== null &&
			start !== null &&
			end - start >= portalRules.minimumDistance
		);
	});
}
export const portalEffect: WorldEffect = {
	tick(run, dt) {
		if (run.portal) run.portal.cooldown = Math.max(0, run.portal.cooldown - dt);
	},
	crossing(run, enemy, previous, build) {
		const portal = run.portal;
		if (!portal || enemy.teleported || portal.cooldown > 0) return;
		const entrance = roadProgress(run.map, portal.entrance, enemy.path);
		const exit = roadProgress(run.map, portal.exit, enemy.path);
		if (
			entrance === null ||
			exit === null ||
			entrance - exit < portalRules.minimumDistance
		)
			return;
		if (previous > entrance || enemy.progress < entrance) return;
		enemy.progress = exit;
		enemy.teleported = true;
		portal.cooldown = portalRules.cooldown;
		run.teleports++;
		enemy.slow = Math.max(enemy.slow, build.teleportSlow);
	},
};
