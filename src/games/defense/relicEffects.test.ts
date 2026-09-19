import { expect, test } from "vite-plus/test";
import {
	activeRelics,
	burnFactor,
	flatDamage,
	oilFactor,
	shieldFactor,
	stunBonus,
	waveEndCoins,
} from "./effects/relicEffects";
import type { Run } from "./components/runComponent";

const run = (fields: Partial<Run>) => ({ relics: [], ...fields }) as Run;

test("a blueprint acts as a second copy of the relic to its right", () => {
	expect(activeRelics(["blueprint", "bellows", "tar"])).toEqual([
		"blueprint",
		"bellows",
		"tar",
		"bellows",
	]);
	expect(activeRelics(["bellows", "blueprint"])).toEqual([
		"bellows",
		"blueprint",
	]);
});

test("bellows, a vial and ash each multiply burning, and they stack", () => {
	expect(burnFactor([])).toBe(1);
	expect(burnFactor(["bellows"])).toBeCloseTo(4 / 3);
	expect(burnFactor(["vial"])).toBe(2);
	expect(burnFactor(["ash"])).toBe(3);
	expect(burnFactor(["vial", "ash"])).toBe(6);
});

test("a tar barrel keeps oil on for half again as long", () => {
	expect(oilFactor([])).toBe(1);
	expect(oilFactor(["tar"])).toBe(1.5);
});

test("a weight adds a second to every stun", () => {
	expect(stunBonus([])).toBe(0);
	expect(stunBonus(["weight"])).toBe(1);
});

test("whetstone, greed, fowler and brand add flat damage to the towers they fit", () => {
	const state = run({
		relics: ["whetstone", "greed", "fowler", "brand"],
		coins: 45,
		towersBuilt: 4,
		flyerKills: 3,
		stunKills: 2,
	});
	expect(flatDamage(state, "arrow")).toBe(7);
	expect(flatDamage(state, "stone")).toBe(8);
	expect(flatDamage(run({}), "arrow")).toBe(0);
});

test("an autopsy trades damage on flesh for damage on shields", () => {
	expect(shieldFactor([], "shieldSquad")).toBe(1);
	expect(shieldFactor(["autopsy"], "shieldSquad")).toBe(2);
	expect(shieldFactor(["autopsy"], "goblin")).toBe(0.5);
});

test("interest pays out per five coins and the piggy bank only fills", () => {
	expect(waveEndCoins(run({ coins: 52, relics: ["interest"] }))).toBe(10);
	expect(waveEndCoins(run({ coins: 52, relics: ["piggy"] }))).toBe(0);
	expect(waveEndCoins(run({ coins: 52 }))).toBe(0);
});

test("an outpost doubles the tower farthest from the gate, a last stand the nearest", async () => {
	const { damageFactor } = await import("./effects/relicEffects");
	const towers = [
		{ slot: 0, kind: "arrow", rushed: 0 },
		{ slot: 1, kind: "arrow", rushed: 0 },
	] as never as Run["towers"];
	const sites = [
		{ x: 0, y: 0 },
		{ x: 100, y: 0 },
	];
	const gate = { x: 120, y: 0 };
	const state = run({ relics: ["outpost"], towers, health: 100 });
	expect(damageFactor(state, towers[0], sites, gate)).toBe(2);
	expect(damageFactor(state, towers[1], sites, gate)).toBe(1);
	const dying = run({ relics: ["lastStand"], towers, health: 10 });
	expect(damageFactor(dying, towers[1], sites, gate)).toBeCloseTo(1.9);
	expect(damageFactor(dying, towers[0], sites, gate)).toBe(1);
});

test("a rushed tower fires at half strength until its ten seconds run out", async () => {
	const { damageFactor } = await import("./effects/relicEffects");
	const towers = [
		{ slot: 0, kind: "arrow", rushed: 4 },
	] as never as Run["towers"];
	const sites = [{ x: 0, y: 0 }];
	const gate = { x: 100, y: 0 };
	expect(
		damageFactor(run({ towers, health: 100 }), towers[0], sites, gate),
	).toBe(0.5);
});

test("a battery speeds up towers of the same kind standing next to each other", async () => {
	const { rateFactor } = await import("./effects/relicEffects");
	const towers = [
		{ slot: 0, kind: "arrow", rate: 1 },
		{ slot: 1, kind: "arrow", rate: 1 },
		{ slot: 3, kind: "stone", rate: 1 },
	] as never as Run["towers"];
	const paired = run({ relics: ["battery"], towers });
	expect(rateFactor(paired, towers[0])).toBe(1.25);
	expect(rateFactor(paired, towers[2])).toBe(1);
	expect(rateFactor(run({ towers }), towers[0])).toBe(1);
	const veteran = {
		slot: 5,
		kind: "arrow",
		rate: 1.25,
	} as never as Run["towers"][number];
	expect(rateFactor(run({ towers: [veteran] }), veteran)).toBe(1.25);
});

test("flat relic damage only adds to towers that already deal damage", async () => {
	const { towerDamage } = await import("./effects/relicEffects");
	const state = run({ relics: ["greed"], coins: 100 });
	expect(towerDamage(state, "oil", 0)).toBe(0);
	expect(towerDamage(state, "arrow", 12)).toBe(17);
});

test("interest never pays more than 200 a wave, blueprint copy included", () => {
	expect(waveEndCoins(run({ coins: 14000, relics: ["interest"] }))).toBe(200);
	expect(
		waveEndCoins(run({ coins: 14000, relics: ["blueprint", "interest"] })),
	).toBe(200);
	expect(
		waveEndCoins(run({ coins: 500, relics: ["blueprint", "interest"] })),
	).toBe(200);
});
