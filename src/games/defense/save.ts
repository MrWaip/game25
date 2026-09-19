import { waveDefinition } from "./definitions/campaign";
import { enemies } from "./definitions/enemies";
import { relics } from "./definitions/relics";
import { Run } from "./components/runComponent";
import type {
	EnemyKind,
	EnemyState,
	Phase,
	RelicId,
	SpecializationId,
	TowerKind,
	TowerLevel,
	TowerState,
	ShotState,
	ShotImpact,
	ProjectileSpriteId,
} from "./model";
import { sites, sitesFor, sitesPerExtension, extensionHeight } from "./board";
import { towers } from "./definitions/towers";
import { balance } from "./config";
import { projectileSprites } from "./definitions/projectiles";
export class InvalidSaveError extends Error {}
export function saveRun(run: Run): string {
	return JSON.stringify({ version: "gdd-8", run: { ...run } });
}
function object(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		throw new Error();
	return Object.fromEntries(Object.entries(value));
}
function number(
	value: unknown,
	min = 0,
	max = Number.MAX_SAFE_INTEGER,
): number {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < min ||
		value > max
	)
		throw new Error();
	return value;
}
function text(value: unknown): string {
	if (typeof value !== "string" || !value.length) throw new Error();
	return value;
}
function choice<T extends string | number | null>(
	value: unknown,
	choices: T[],
): T {
	const result = choices.find((item) => item === value);
	if (result === undefined) throw new Error();
	return result;
}
function list<T>(value: unknown, read: (item: unknown) => T): T[] {
	if (!Array.isArray(value) || value.length > 10000) throw new Error();
	return value.map(read);
}
function tower(value: unknown): TowerState {
	const data = object(value);
	return {
		slot: number(data.slot),
		kind: choice<TowerKind>(
			data.kind,
			Object.values(towers).map((t) => t.id),
		),
		level: choice<TowerLevel>(data.level, [1, 2, 3]),
		specialization: choice<SpecializationId | null>(data.specialization, [
			null,
			...Object.values(towers).flatMap((tower) =>
				tower.specializations.map((branch) => branch.id),
			),
		]),
		cooldown: number(data.cooldown, -10000),
		construction:
			data.construction === undefined ? 0 : number(data.construction, 0, 60),
		constructionKind:
			data.constructionKind === undefined
				? null
				: choice(data.constructionKind, [null, "build", "upgrade"]),
		shots: data.shots === undefined ? 0 : number(data.shots),
		rate: data.rate === undefined ? 1 : number(data.rate, 0.1, 10),
		rushed: data.rushed === undefined ? 0 : number(data.rushed, 0, 60),
		order: data.order === undefined ? 0 : number(data.order),
	};
}
function enemy(value: unknown): EnemyState {
	const data = object(value);
	return {
		id: number(data.id, 1),
		kind: choice<EnemyKind>(
			data.kind,
			Object.values(enemies).map((e) => e.id),
		),
		memberHp:
			data.kind === "shieldSquad" ? number(data.memberHp, 1) : undefined,
		distance: number(data.distance),
		hp: number(data.hp),
		maxHp: number(data.maxHp, 1),
		oil: number(data.oil),
		layers: data.layers === undefined ? 0 : number(data.layers, 0, 3),
		slow: number(data.slow, 0, 1),
		acid: data.acid === undefined ? 0 : number(data.acid),
		vulnerability:
			data.vulnerability === undefined ? 1 : number(data.vulnerability, 1, 10),
		stun: data.stun === undefined ? 0 : number(data.stun, 0, 60),
		burn: number(data.burn),
		burnStacks: number(data.burnStacks, 0, 3),
		spreadIn: number(data.spreadIn, -1),
	};
}
function pendingImpact(value: unknown): ShotImpact | undefined {
	if (value === undefined) return undefined;
	const data = object(value);
	if (typeof data.ignite !== "boolean") throw new Error();
	return {
		targetId: number(data.targetId, 1),
		damage: number(data.damage),
		ignite: data.ignite,
		splash:
			data.splash === undefined
				? undefined
				: {
						radius: number(object(data.splash).radius),
						shieldMultiplier: number(object(data.splash).shieldMultiplier, 1),
					},
		ricochet:
			data.ricochet === undefined
				? undefined
				: {
						targets: number(object(data.ricochet).targets, 1, 10),
						factor: number(object(data.ricochet).factor, 0, 10),
						radius: number(object(data.ricochet).radius, 1),
					},
		stun: data.stun === undefined ? undefined : number(data.stun, 0, 60),
	};
}
function shot(value: unknown): ShotState {
	const data = object(value),
		from = object(data.from),
		to = object(data.to);
	if (typeof data.fire !== "boolean") throw new Error();
	return {
		impact: pendingImpact(data.impact),
		hitTargetId:
			data.hitTargetId === undefined ? undefined : number(data.hitTargetId, 1),
		from: { x: number(from.x), y: number(from.y, -5 * extensionHeight) },
		to: { x: number(to.x), y: number(to.y, -5 * extensionHeight) },
		sprite: choice<ProjectileSpriteId | "shieldBreak" | "breach">(data.sprite, [
			...projectileSprites,
			"shieldBreak",
			"breach",
		]),
		fire: data.fire,
		age: number(data.age, 0, 2),
	};
}
function relic(value: unknown): RelicId {
	return choice<RelicId>(
		value,
		Object.values(relics).map((r) => r.id),
	);
}
export function loadRun(saved: string): Run {
	try {
		const parsed: unknown = JSON.parse(saved),
			data = object(parsed);
		if (
			data.version !== "gdd-1" &&
			data.version !== "gdd-2" &&
			data.version !== "gdd-3" &&
			data.version !== "gdd-4" &&
			data.version !== "gdd-5" &&
			data.version !== "gdd-6" &&
			data.version !== "gdd-7" &&
			data.version !== "gdd-8"
		)
			throw new Error();
		const state = object(data.run),
			run = new Run(text(state.seed));
		run.runId = text(state.runId);
		run.phase = choice<Phase>(state.phase, [
			"ready",
			"wave",
			"reward",
			"prepare",
			"falling",
			"lost",
			"won",
		]);
		run.coins = number(state.coins);
		run.health = number(state.health, 0, balance.health);
		run.wave = number(state.wave, 0, 10000);
		run.level = number(state.level, 1, 3334);
		run.completedWaves = number(state.completedWaves, 0, 10000);
		run.elapsedSeconds = number(state.elapsedSeconds);
		run.fallTime = number(state.fallTime);
		run.kills = number(state.kills);
		run.towersBuilt =
			state.towersBuilt === undefined ? 0 : number(state.towersBuilt);
		run.flyerKills =
			state.flyerKills === undefined ? 0 : number(state.flyerKills);
		run.stunKills = state.stunKills === undefined ? 0 : number(state.stunKills);
		run.ignites = state.ignites === undefined ? 0 : number(state.ignites);
		run.coinsEarned =
			state.coinsEarned === undefined ? 0 : number(state.coinsEarned);
		run.coinsSpent =
			state.coinsSpent === undefined ? 0 : number(state.coinsSpent);
		run.nextOrder =
			state.nextOrder === undefined ? 1 : number(state.nextOrder, 1);
		run.piggyCoins =
			state.piggyCoins === undefined ? 0 : number(state.piggyCoins);
		run.remaining = number(state.remaining, 0, 1000);
		run.spawnIn = number(state.spawnIn, -10000);
		if (
			data.version !== "gdd-5" &&
			data.version !== "gdd-6" &&
			data.version !== "gdd-7" &&
			data.version !== "gdd-8" &&
			run.remaining > 0 &&
			run.wave > 0
		) {
			const oldCounts = [
				6, 10, 10, 14, 18, 18, 22, 26, 30, 24, 28, 24, 30, 34, 26, 36, 42, 38,
			];
			const fraction = Math.min(1, run.remaining / oldCounts[run.wave - 1]);
			run.remaining = Math.ceil(waveDefinition(run.wave).count * fraction);
		}

		run.nextId = number(state.nextId, 1);
		run.towers = list(state.towers, tower);
		if (data.version === "gdd-1") {
			for (const tower of run.towers) {
				if (tower.slot >= 6) {
					const oldSlot = tower.slot - 6;
					tower.slot = 6 + Math.floor(oldSlot / 2) * 6 + (oldSlot % 2);
				}
			}
		}
		if (
			data.version !== "gdd-4" &&
			data.version !== "gdd-5" &&
			data.version !== "gdd-6" &&
			data.version !== "gdd-7" &&
			data.version !== "gdd-8"
		) {
			for (const tower of run.towers) {
				if (tower.slot >= 6) {
					const oldSlot = tower.slot - 6;
					tower.slot =
						sites.length +
						Math.floor(oldSlot / 6) * sitesPerExtension +
						(oldSlot % 6);
				}
			}
		}
		run.enemies = list(state.enemies, enemy);
		run.shots = list(state.shots, shot);
		run.relics = list(state.relics, relic);
		run.offers = list(state.offers, relic);
		if (
			[run.wave, run.level, run.remaining, run.nextId].some(
				(value) => value % 1 !== 0,
			)
		)
			throw new Error();
		if (
			new Set(run.towers.map((t) => t.slot)).size !== run.towers.length ||
			new Set(run.enemies.map((e) => e.id)).size !== run.enemies.length
		)
			throw new Error();
		if (
			new Set(run.relics).size !== run.relics.length ||
			new Set(run.offers).size !== run.offers.length ||
			run.offers.some((id) => run.relics.includes(id))
		)
			throw new Error();
		if (
			run.towers.some(
				(t) =>
					!sitesFor(run.level)[t.slot] ||
					t.construction > 0 !== (t.constructionKind !== null) ||
					(t.level === 3
						? !towers[t.kind].specializations.some(
								(s) => s.id === t.specialization,
							)
						: t.specialization !== null),
			)
		)
			throw new Error();
		if (run.phase === "wave" && run.wave === 0) throw new Error();
		if (run.wave > 0 && run.remaining > waveDefinition(run.wave).count)
			throw new Error();
		return run;
	} catch {
		throw new InvalidSaveError("Сохранение несовместимо с прототипом.");
	}
}
