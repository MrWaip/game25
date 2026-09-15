import { enemyDefinitions } from "@/games/defense/definitions/enemies";
import type { Enemy } from "@/games/defense/components/enemyComponent";
export function speedAuraMultiplier(
	enemy: Enemy,
	enemies: readonly Enemy[],
): number {
	return enemies.reduce((multiplier, source) => {
		const aura = enemyDefinitions[source.kind].speedAura;
		return source !== enemy &&
			aura &&
			Math.hypot(source.x - enemy.x, source.y - enemy.y) <= aura.radius
			? Math.max(multiplier, aura.multiplier)
			: multiplier;
	}, 1);
}
