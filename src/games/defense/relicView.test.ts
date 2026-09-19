import { expect, test } from "vite-plus/test";
import {
	enemyStatuses,
	relicReadout,
	towerBuffs,
	towerStats,
} from "./relicView";
import type { Run } from "./components/runComponent";
import type { EnemyState, TowerState } from "./model";

const run = (fields: Partial<Run>) =>
	({
		relics: [],
		towers: [],
		coins: 0,
		health: 100,
		towersBuilt: 0,
		flyerKills: 0,
		stunKills: 0,
		ignites: 0,
		piggyCoins: 0,
		...fields,
	}) as Run;
const tower = (fields: Partial<TowerState>): TowerState => ({
	slot: 0,
	kind: "arrow",
	level: 1,
	specialization: null,
	cooldown: 0,
	construction: 0,
	constructionKind: null,
	shots: 0,
	rate: 1,
	rushed: 0,
	order: 0,
	...fields,
});
const enemy = (fields: Partial<EnemyState>): EnemyState => ({
	id: 1,
	kind: "goblin",
	distance: 0,
	hp: 10,
	maxHp: 10,
	oil: 0,
	layers: 0,
	slow: 0,
	acid: 0,
	vulnerability: 1,
	stun: 0,
	burn: 0,
	burnStacks: 0,
	spreadIn: 0,
	...fields,
});

test("an owned relic reads out what it has gathered so far", () => {
	const state = run({
		relics: ["whetstone", "piggy", "tinder", "blueprint", "tar"],
		towersBuilt: 7,
		piggyCoins: 12,
		ignites: 37,
	});
	expect(relicReadout(state, "whetstone")).toBe("+3.5 урона");
	expect(relicReadout(state, "piggy")).toBe("Внутри 12 монет");
	expect(relicReadout(state, "tinder")).toBe("Поджогов 37/50");
	expect(relicReadout(state, "blueprint")).toBe("Копирует: Смоляная бочка");
	expect(relicReadout(state, "tar")).toBeNull();
	expect(relicReadout(run({ relics: ["tar", "blueprint"] }), "blueprint")).toBe(
		"Справа пусто — копировать нечего",
	);
});

test("a tower lists the relics that are boosting it right now", () => {
	const sites = [
		{ x: 0, y: 0 },
		{ x: 50, y: 0 },
	];
	const gate = { x: 100, y: 0 };
	const far = tower({ slot: 0, rushed: 3.2 });
	const near = tower({ slot: 1, rate: 1.25 });
	const state = run({
		relics: ["outpost", "battery", "brigade", "whetstone"],
		towers: [far, near],
		towersBuilt: 2,
	});
	expect(towerBuffs(state, far, sites, gate).map((buff) => buff.relic)).toEqual(
		["whetstone", "outpost", "battery", "rush"],
	);
	expect(
		towerBuffs(state, near, sites, gate).map((buff) => buff.relic),
	).toEqual(["whetstone", "battery", "brigade"]);
});

test("tower stats show the final damage and reload against the base", () => {
	const sites = [{ x: 0, y: 0 }];
	const gate = { x: 100, y: 0 };
	const arrow = tower({});
	const state = run({
		relics: ["outpost", "whetstone"],
		towers: [arrow],
		towersBuilt: 2,
	});
	expect(towerStats(state, arrow, sites, gate)).toEqual({
		damage: 26,
		baseDamage: 12,
		interval: 0.75,
		baseInterval: 0.75,
	});
});

test("an enemy shows every status on it, with burn stacks", () => {
	expect(enemyStatuses(enemy({}))).toEqual([]);
	expect(
		enemyStatuses(
			enemy({
				oil: 2,
				acid: 3,
				vulnerability: 1.5,
				burn: 1,
				burnStacks: 2,
				stun: 1,
			}),
		),
	).toEqual([
		{ id: "acid" },
		{ id: "vulnerable" },
		{ id: "burn", stacks: 2 },
		{ id: "stun" },
	]);
	expect(enemyStatuses(enemy({ oil: 2 }))).toEqual([{ id: "oil" }]);
});

test("an oil badge counts its layers once there is more than one", () => {
	expect(enemyStatuses(enemy({ oil: 2, layers: 3 }))).toEqual([
		{ id: "oil", layers: 3 },
	]);
});

test("the interest card shows what will actually be paid", () => {
	expect(
		relicReadout(run({ relics: ["interest"], coins: 14000 }), "interest"),
	).toBe("+200 в конце волны");
});
