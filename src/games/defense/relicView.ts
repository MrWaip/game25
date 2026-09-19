import type {
	EnemyState,
	Point,
	RelicId,
	RelicRarity,
	TowerState,
} from "./model";
import { relics } from "./definitions/relics";
import { towerAttack } from "./definitions/towers";
import {
	activeRelics,
	damageFactor,
	towerDamage,
	rateFactor,
	type RelicRun,
	waveEndCoins,
} from "./effects/relicEffects";
import { balance } from "./config";

export const rarityLooks: Record<
	RelicRarity,
	{ label: string; frame: string; ribbon: string; shine: boolean }
> = {
	common: {
		label: "Обычная",
		frame: "#b07a45",
		ribbon: "#7a4f2a",
		shine: false,
	},
	rare: { label: "Редкая", frame: "#4f8fe0", ribbon: "#2c5da3", shine: false },
	key: { label: "Ключевая", frame: "#f2c14e", ribbon: "#b3831c", shine: true },
};

export function relicReadout(run: RelicRun, id: RelicId): string | null {
	const index = run.relics.indexOf(id);
	switch (id) {
		case "whetstone":
			return `+${run.towersBuilt * 0.5} урона`;
		case "greed":
			return `+${Math.floor(run.coins / 20)} урона`;
		case "fowler":
			return `+${run.flyerKills} урона стрелам`;
		case "brand":
			return `+${run.stunKills * 2} урона камнемётам`;
		case "interest":
			return `+${waveEndCoins(run)} в конце волны`;
		case "piggy":
			return `Внутри ${run.piggyCoins} монет`;
		case "tinder":
			return `Поджогов ${Math.min(run.ignites, 50)}/50`;
		case "lastStand":
			return `×${(2 - run.health / balance.health).toFixed(1)} урона`;
		case "blueprint": {
			const copied = run.relics[index + 1];
			return copied
				? `Копирует: ${relics[copied].title}`
				: "Справа пусто — копировать нечего";
		}
		default:
			return null;
	}
}

export type TowerBuff = { relic: RelicId; label: string };
function distance(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}
export function towerBuffs(
	run: RelicRun,
	tower: TowerState,
	sites: readonly Point[],
	gate: Point,
): TowerBuff[] {
	const active = activeRelics(run.relics);
	const buffs: TowerBuff[] = [];
	const flat: [RelicId, boolean][] = [
		["whetstone", run.towersBuilt > 0],
		["greed", run.coins >= 20],
		["fowler", tower.kind === "arrow" && run.flyerKills > 0],
		["brand", tower.kind === "stone" && run.stunKills > 0],
	];
	for (const [relic, applies] of flat)
		if (applies && active.includes(relic))
			buffs.push({ relic, label: relics[relic].title });
	const toGate = (t: TowerState) => distance(sites[t.slot], gate);
	if (
		active.includes("outpost") &&
		run.towers.every((other) => toGate(other) <= toGate(tower))
	)
		buffs.push({ relic: "outpost", label: "Аванпост ×2" });
	if (
		active.includes("lastStand") &&
		run.towers.every((other) => toGate(other) >= toGate(tower))
	)
		buffs.push({ relic: "lastStand", label: relics.lastStand.title });
	if (
		active.includes("battery") &&
		run.towers.some(
			(other) =>
				other !== tower &&
				other.kind === tower.kind &&
				Math.abs(other.slot - tower.slot) === 1,
		)
	)
		buffs.push({ relic: "battery", label: relics.battery.title });
	if (tower.rate > 1)
		buffs.push({ relic: "brigade", label: relics.brigade.title });
	if (tower.rushed > 0)
		buffs.push({
			relic: "rush",
			label: `Аврал · вполсилы ${Math.ceil(tower.rushed)} с`,
		});
	if (active.includes("echo"))
		buffs.push({ relic: "echo", label: relics.echo.title });
	return buffs;
}

export function towerStats(
	run: RelicRun,
	tower: TowerState,
	sites: readonly Point[],
	gate: Point,
): {
	damage: number;
	baseDamage: number;
	interval: number;
	baseInterval: number;
} {
	const attack = towerAttack(tower.kind, tower.level, tower.specialization);
	const baseDamage = attack.effects.reduce(
		(sum, effect) => sum + (effect.type === "damage" ? effect.amount : 0),
		0,
	);
	const damage =
		towerDamage(run, tower.kind, baseDamage) *
		damageFactor(run, tower, sites, gate);
	return {
		damage: Math.round(damage * 10) / 10,
		baseDamage,
		interval:
			Math.round((attack.interval / rateFactor(run, tower)) * 100) / 100,
		baseInterval: attack.interval,
	};
}

export type EnemyStatus =
	| { id: "oil"; layers?: number }
	| { id: "acid" | "vulnerable" | "stun" }
	| { id: "burn"; stacks: number };
export function enemyStatuses(enemy: EnemyState): EnemyStatus[] {
	const statuses: EnemyStatus[] = [];
	const coated = enemy.oil > 0;
	if (coated && enemy.acid > 0) statuses.push({ id: "acid" });
	if (coated && enemy.vulnerability > 1) statuses.push({ id: "vulnerable" });
	if (coated && !enemy.acid && enemy.vulnerability <= 1)
		statuses.push(
			enemy.layers > 1 ? { id: "oil", layers: enemy.layers } : { id: "oil" },
		);
	if (enemy.burn > 0)
		statuses.push({ id: "burn", stacks: Math.max(1, enemy.burnStacks) });
	if (enemy.stun > 0) statuses.push({ id: "stun" });
	return statuses;
}
