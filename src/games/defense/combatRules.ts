import { towerDefinitions } from "@/games/defense/definitions/towers";
import type { DamageType } from "@/games/defense/definitions/towers";
import {
	enemyDefinitions,
	type EnemyKind,
} from "@/games/defense/definitions/enemies";
import type { BuildModifiers } from "@/games/defense/effects/buildModifiers";
import type { Tower } from "@/games/defense/components/towerComponent";
import type { Enemy } from "@/games/defense/components/enemyComponent";
export function attackStats(tower: Tower, build: BuildModifiers) {
	const definition = towerDefinitions[tower.kind];
	return {
		...definition,
		attack:
			tower.kind === "frost" && build.frostSplash > 0
				? {
						...definition.attack,
						shape: "splash" as const,
						radius: build.frostSplash,
					}
				: definition.attack,
		damage:
			definition.damage *
			(1 + (tower.level - 1) * 0.65) *
			(1 + build.damageBonus),
		interval: definition.interval / (1 + build.attackRateBonus),
		targets: 1 + (definition.attack.chains ? build.additionalTargets : 0),
		slow:
			definition.attack.slow > 0
				? definition.attack.slow + build.slowDurationBonus
				: 0,
	};
}
export function damageReceived(
	enemy: Enemy,
	amount: number,
	type: DamageType,
	chilled: boolean,
	build: BuildModifiers,
): number {
	return (
		amount *
		(1 - enemyDefinitions[enemy.kind as EnemyKind].resistance[type]) *
		(chilled ? 1 + build.chilledDamageBonus : 1) *
		(enemy.teleported ? 1 + build.teleportDamageBonus : 1)
	);
}
