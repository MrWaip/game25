import { upgrades, type Upgrade } from "@/games/defense/definitions/upgrades";
export type BuildModifiers = {
	shieldBurstDamage: number;
	frostSplash: number;
	conductionDamage: number;
	deathSlow: number;
	damageBonus: number;
	attackRateBonus: number;
	chilledDamageBonus: number;
	additionalTargets: number;
	slowDurationBonus: number;
	shardDamage: number;
	teleportDamageBonus: number;
	teleportSlow: number;
	snowRadiusBonus: number;
	snowAdaptation: number;
};
export function buildModifiers(
	bonuses: Record<Upgrade, number>,
): BuildModifiers {
	const result: BuildModifiers = {
		shieldBurstDamage: 0,
		frostSplash: 0,
		conductionDamage: 0,
		deathSlow: 0,
		damageBonus: 0,
		attackRateBonus: 0,
		chilledDamageBonus: 0,
		additionalTargets: 0,
		slowDurationBonus: 0,
		shardDamage: 0,
		teleportDamageBonus: 0,
		teleportSlow: 0,
		snowRadiusBonus: 0,
		snowAdaptation: 0,
	};
	for (const key of Object.keys(upgrades) as Upgrade[]) {
		for (const [stat, value] of Object.entries(upgrades[key].modifiers))
			result[stat as keyof BuildModifiers] += value * bonuses[key];
	}
	return result;
}
