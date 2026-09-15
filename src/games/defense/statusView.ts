import { defenseTheme } from "@/games/defense/theme";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { Enemy } from "@/games/defense/components/enemyComponent";
import type { Tower } from "@/games/defense/components/towerComponent";
import type { BuildModifiers } from "@/games/defense/effects/buildModifiers";
import { enemyDefinitions } from "@/games/defense/definitions/enemies";
import { isChilled, attackDelay } from "@/games/defense/worldRules";
import { speedAuraMultiplier } from "@/games/defense/enemyRules";
import { slotsFor } from "@/games/defense/board";
export type StatusBadge = { icon: string; label: string; color: string };
const statuses = {
	cold: { icon: "❄", label: "Замедление", color: defenseTheme.statuses.cold },
	armor: {
		icon: "▣",
		label: "Физическая броня",
		color: defenseTheme.statuses.armor,
	},
	ward: {
		icon: "◇",
		label: "Защита от магии",
		color: defenseTheme.statuses.ward,
	},
	haste: { icon: "↑", label: "Ускорение", color: defenseTheme.statuses.haste },
	echo: {
		icon: "◎",
		label: "Уязвимость после портала",
		color: defenseTheme.statuses.echo,
	},
	chilledWeapon: {
		icon: "↓",
		label: "Скорость башни снижена снегом",
		color: defenseTheme.statuses.chilledWeapon,
	},
	power: {
		icon: "+",
		label: "Урон усилен джокером",
		color: defenseTheme.statuses.power,
	},
} as const;
export function enemyStatuses(
	state: DefenseSnapshot,
	enemy: Enemy,
	build: BuildModifiers,
): StatusBadge[] {
	const result: StatusBadge[] = [];
	const resistance = enemyDefinitions[enemy.kind].resistance;
	if (isChilled(state, enemy, build)) result.push(statuses.cold);
	if (resistance.physical > 0) result.push(statuses.armor);
	if (resistance.magic > 0) result.push(statuses.ward);
	if (speedAuraMultiplier(enemy, state.enemies) > 1)
		result.push(statuses.haste);
	if (enemy.teleported && build.teleportDamageBonus > 0)
		result.push(statuses.echo);
	return result;
}
export function towerStatuses(
	state: DefenseSnapshot,
	tower: Tower,
	build: BuildModifiers,
): StatusBadge[] {
	const result: StatusBadge[] = [];
	if (attackDelay(state, slotsFor(state.map)[tower.slot], build) > 1)
		result.push(statuses.chilledWeapon);
	if (build.attackRateBonus > 0) result.push(statuses.haste);
	if (build.damageBonus > 0) result.push(statuses.power);
	return result;
}
