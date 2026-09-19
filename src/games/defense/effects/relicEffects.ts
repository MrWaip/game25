import type {
	EnemyKind,
	Point,
	RelicId,
	TowerKind,
	TowerState,
} from "../model";
import { balance } from "../config";
import type { Run } from "../components/runComponent";

export type RelicRun = Pick<
	Run,
	| "relics"
	| "towers"
	| "coins"
	| "health"
	| "towersBuilt"
	| "flyerKills"
	| "stunKills"
	| "ignites"
	| "piggyCoins"
>;

export function activeRelics(relics: readonly RelicId[]): RelicId[] {
	const active = [...relics];
	relics.forEach((relic, index) => {
		const copied = relics[index + 1];
		if (relic === "blueprint" && copied) active.push(copied);
	});
	return active;
}
function times(relics: readonly RelicId[], id: RelicId): number {
	return relics.filter((relic) => relic === id).length;
}
export function burnFactor(relics: readonly RelicId[]): number {
	const active = activeRelics(relics);
	return (
		(4 / 3) ** times(active, "bellows") *
		2 ** times(active, "vial") *
		3 ** times(active, "ash")
	);
}
export function oilFactor(relics: readonly RelicId[]): number {
	return 1.5 ** times(activeRelics(relics), "tar");
}
export function stunBonus(relics: readonly RelicId[]): number {
	return times(activeRelics(relics), "weight");
}
export function shieldFactor(
	relics: readonly RelicId[],
	kind: EnemyKind,
): number {
	if (!activeRelics(relics).includes("autopsy")) return 1;
	return kind === "shieldSquad" ? 2 : 0.5;
}
export function flatDamage(run: RelicRun, kind: TowerKind): number {
	const active = activeRelics(run.relics);
	let damage = 0;
	if (active.includes("whetstone")) damage += run.towersBuilt * 0.5;
	if (active.includes("greed")) damage += Math.floor(run.coins / 20);
	if (kind === "arrow" && active.includes("fowler")) damage += run.flyerKills;
	if (kind === "stone" && active.includes("brand")) damage += run.stunKills * 2;
	return damage;
}
export function waveEndCoins(run: RelicRun): number {
	const active = activeRelics(run.relics);
	return Math.min(
		balance.interestCap,
		Math.floor(run.coins / 5) * times(active, "interest"),
	);
}

function distance(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}
export function damageFactor(
	run: RelicRun,
	tower: TowerState,
	sites: readonly Point[],
	gate: Point,
): number {
	const active = activeRelics(run.relics);
	let factor = tower.rushed > 0 ? 0.5 : 1;
	const toGate = (candidate: TowerState) =>
		distance(sites[candidate.slot], gate);
	const mine = toGate(tower);
	if (
		active.includes("outpost") &&
		run.towers.every((other) => toGate(other) <= mine)
	)
		factor *= 2;
	if (
		active.includes("lastStand") &&
		run.towers.every((other) => toGate(other) >= mine)
	)
		factor *= 2 - run.health / balance.health;
	return factor;
}
export function rateFactor(run: RelicRun, tower: TowerState): number {
	const active = activeRelics(run.relics);
	const paired =
		active.includes("battery") &&
		run.towers.some(
			(other) =>
				other !== tower &&
				other.kind === tower.kind &&
				Math.abs(other.slot - tower.slot) === 1,
		);
	return tower.rate * (paired ? 1.25 : 1);
}
export function towerDamage(
	run: RelicRun,
	kind: TowerKind,
	base: number,
): number {
	return base > 0 ? base + flatDamage(run, kind) : 0;
}
