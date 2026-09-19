import { upgrades, type Upgrade } from "@/games/defense/definitions/upgrades";
export type BuildModifiers = {
	chargeDamage: number;
	acidBurstDamage: number;
	executionThreshold: number;
	harvestGrowth: number;
	solitudeBonus: number;
	auraDamageBonus: number;
	overdriveSplash: number;
	crossfireBonus: number;
	reserveIncome: number;

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
		chargeDamage: 0,
		acidBurstDamage: 0,
		executionThreshold: 0,
		harvestGrowth: 0,
		solitudeBonus: 0,
		auraDamageBonus: 0,
		overdriveSplash: 0,
		crossfireBonus: 0,
		reserveIncome: 0,

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
