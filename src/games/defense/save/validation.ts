import { Random } from "@/primitives/random";
import {
	enemyDefinitions,
	type EnemyKind,
} from "@/games/defense/definitions/enemies";
import { savedState, savedTower, savedEnemy, type SavedRun } from "./state";
import {
	upgrades,
	economy,
	towerKinds,
	type Upgrade,
} from "@/games/defense/config";
import {
	gridFor,
	validMap,
	classicMap,
	isBuildable,
	validCell,
	routeLength,
} from "@/games/defense/board";
import { eligibleReward } from "@/games/defense/rewards";
import { portalRules, validPortalPair } from "@/games/defense/effects/portal";
import { waveAt } from "@/games/defense/waves";

export const saveVersion = 6;
export class InvalidSaveError extends Error {
	constructor(cause?: unknown) {
		super("Сохранение несовместимо или повреждено", { cause });
		this.name = "InvalidSaveError";
	}
}
function record(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function number(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function integer(value: unknown): value is number {
	return number(value) && Number.isSafeInteger(value);
}
function validState(value: unknown): value is SavedRun {
	if (
		!record(value) ||
		typeof value.seed !== "string" ||
		typeof value.runId !== "string" ||
		value.runId.length < 1 ||
		value.runId.length > 128 ||
		(value.elapsedSeconds !== null && !number(value.elapsedSeconds)) ||
		!validMap(value.map) ||
		typeof value.phase !== "string" ||
		!["draft", "prepare", "wave", "reward", "lost"].includes(
			String(value.phase),
		)
	)
		return false;
	if (
		![
			value.coins,
			value.wave,
			value.health,
			value.kills,
			value.remaining,
			value.waveKills,
			value.waveLeaks,
			value.teleports,
			value.shatters,
		].every(integer) ||
		![value.spawnIn, value.elapsed].every(number)
	)
		return false;
	if (
		Number(value.health) > 10 ||
		Number(value.remaining) > waveAt(Number(value.wave)).enemies.length
	)
		return false;
	if (
		["wave", "reward", "lost"].includes(String(value.phase)) &&
		Number(value.wave) < 1
	)
		return false;
	if (
		!record(value.bonuses) ||
		!Object.entries(upgrades).every(([key, rule]) => {
			const count = (value.bonuses as Record<string, unknown>)[key];
			return integer(count) && count <= rule.max;
		})
	)
		return false;
	if (
		!Array.isArray(value.choices) ||
		value.choices.length > 3 ||
		new Set(value.choices).size !== value.choices.length ||
		!value.choices.every(
			(key) =>
				typeof key === "string" &&
				Object.hasOwn(upgrades, key) &&
				eligibleReward(
					value.bonuses as Record<Upgrade, number>,
					key as Upgrade,
				),
		)
	)
		return false;
	if (
		value.phase === "reward"
			? value.choices.length < 1
			: value.choices.length !== 0
	)
		return false;
	if (
		value.pendingWorld !== null &&
		value.pendingWorld !== "snow" &&
		value.pendingWorld !== "portal"
	)
		return false;
	if (value.pendingWorld && value.phase !== "prepare") return false;
	if (
		value.snow !== null &&
		(!integer(value.snow) ||
			!validCell(value.map, value.snow) ||
			!value.bonuses.snowfall)
	)
		return false;
	if (
		value.pendingWorld === "snow" &&
		(!value.bonuses.snowfall || value.snow !== null)
	)
		return false;
	if (
		value.bonuses.snowfall &&
		value.snow === null &&
		value.pendingWorld !== "snow"
	)
		return false;
	if (value.portal !== null) {
		const p = value.portal;
		if (
			!record(p) ||
			!integer(p.entrance) ||
			!integer(p.exit) ||
			!number(p.cooldown) ||
			p.cooldown > portalRules.cooldown ||
			!value.bonuses.portal
		)
			return false;
		if (!validPortalPair(value.map, p.entrance, p.exit)) return false;
	}
	if (
		value.pendingWorld === "portal" &&
		(!value.bonuses.portal || value.portal !== null)
	)
		return false;
	if (
		value.bonuses.portal &&
		value.portal === null &&
		value.pendingWorld !== "portal"
	)
		return false;
	if (
		!Array.isArray(value.towers) ||
		value.towers.length > value.map.columns * value.map.rows ||
		!value.towers.every(
			(t) =>
				record(t) &&
				integer(t.slot) &&
				isBuildable(value.map as SavedRun["map"], t.slot) &&
				towerKinds.some((kind) => kind === t.kind) &&
				integer(t.level) &&
				t.level >= 1 &&
				t.level <= economy.maxLevel &&
				number(t.cooldown),
		)
	)
		return false;
	if (new Set(value.towers.map((t) => t.slot)).size !== value.towers.length)
		return false;
	return (
		Array.isArray(value.enemies) &&
		value.enemies.length <= 32 &&
		value.enemies.every(
			(e) =>
				record(e) &&
				[e.x, e.y, e.hp, e.maxHp, e.speed, e.progress, e.slow].every(number) &&
				Number(e.x) <= gridFor(value.map as SavedRun["map"]).width &&
				Number(e.y) <= gridFor(value.map as SavedRun["map"]).height &&
				Number(e.hp) > 0 &&
				Number(e.hp) <= Number(e.maxHp) &&
				integer(e.path) &&
				e.path < (value.map as SavedRun["map"]).paths.length &&
				Number(e.progress) <
					routeLength(value.map as SavedRun["map"], e.path) &&
				integer(e.segment) &&
				e.segment >= 1 &&
				e.segment < (value.map as SavedRun["map"]).paths[e.path].length &&
				typeof e.teleported === "boolean" &&
				integer(e.shield) &&
				typeof e.kind === "string" &&
				Object.hasOwn(enemyDefinitions, e.kind) &&
				e.shield <=
					Math.max(
						enemyDefinitions[e.kind as EnemyKind].shield,
						enemyDefinitions[e.kind as EnemyKind].shieldRefresh?.charges ?? 0,
					) &&
				number(e.shieldTimer),
		)
	);
}
export function decodeSave(serialized: string): SavedRun {
	let value: unknown;
	try {
		value = JSON.parse(serialized);
	} catch (error) {
		throw new InvalidSaveError(error);
	}
	if (
		!record(value) ||
		![2, 3, 4, 5, saveVersion].includes(Number(value.version)) ||
		typeof value.version !== "number"
	)
		throw new InvalidSaveError();
	const state = value.state;
	if (Number(value.version) < 4 && record(state)) {
		// Older versions always used the original map and one enemy path.
		state.map = structuredClone(classicMap);
		if (Array.isArray(state.enemies))
			state.enemies = state.enemies.map((enemy) =>
				record(enemy) ? { ...enemy, path: 0 } : enemy,
			);
	}
	if (
		value.version === 4 &&
		record(state) &&
		record(state.map) &&
		!("columns" in state.map) &&
		!("rows" in state.map)
	) {
		// The first generated maps used the fixed 7 by 10 field.
		state.map = { ...state.map, columns: 7, rows: 10 };
	}
	if (Number(value.version) < 5 && record(state) && record(state.bonuses)) {
		for (const key of ["shieldBurst", "frostRelay", "conduction", "coldDeath"])
			state.bonuses[key] = 0;
	}
	if (Number(value.version) < 6 && record(state)) {
		state.runId = "legacy";
		state.elapsedSeconds = null;
	}
	// Completed finite runs can continue; their old wave payout was already saved.
	if (record(state) && state.phase === "won" && state.wave === 5)
		state.phase = "prepare";
	if (!validState(state)) throw new InvalidSaveError();
	if (Number(value.version) < 6) {
		const canonical = JSON.stringify({
			...savedState(state),
			towers: state.towers.map(savedTower),
			enemies: state.enemies.map(savedEnemy),
		});
		state.runId =
			"legacy-" +
			[0, 1, 2, 3]
				.map((index) =>
					new Random(canonical + ":" + index)
						.int(0, 0xffffffff)
						.toString(16)
						.padStart(8, "0"),
				)
				.join("");
	}
	return state;
}
