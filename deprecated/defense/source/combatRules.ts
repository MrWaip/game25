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
	const focused = tower.specialization === "focus";
	const spread = tower.specialization === "spread";
	return {
		...definition,
		attack:
			tower.kind === "frost" && (build.frostSplash > 0 || spread)
				? {
						...definition.attack,
						shape: "splash" as const,
						radius: Math.max(build.frostSplash, spread ? 48 : 0),
					}
				: {
						...definition.attack,
						radius: definition.attack.radius * (spread ? 1.5 : 1),
					},
		damage:
			definition.damage *
			Math.pow(1.55, tower.level - 1) *
			(1 + build.damageBonus) *
			(focused ? 1.8 : 1),
		interval:
			definition.interval /
			(1 + build.attackRateBonus) /
			(spread && tower.kind === "rapid" ? 1.35 : 1),
		range: definition.range * (spread && tower.kind === "arcane" ? 1.3 : 1),
		targets:
			1 +
			(definition.attack.chains ? build.additionalTargets : 0) +
			(spread && (tower.kind === "arcane" || tower.kind === "corrode") ? 1 : 0),
		slow:
			definition.attack.slow > 0
				? definition.attack.slow + build.slowDurationBonus + (focused ? 2 : 0)
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
		(1 -
			Math.max(
				0,
				enemyDefinitions[enemy.kind as EnemyKind].resistance[type] -
					(type === "physical" ? enemy.corrosion : 0),
			)) *
		(chilled ? 1 + build.chilledDamageBonus : 1) *
		(enemy.teleported ? 1 + build.teleportDamageBonus : 1)
	);
}
