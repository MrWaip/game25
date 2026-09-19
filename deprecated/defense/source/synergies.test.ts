import { expect, it } from "vite-plus/test";
import { createCombatScenario as scenario } from "@/games/defense/testkit/combatScenario";
import { discoveredChain } from "@/games/defense/synergyRules";

it("glacier spreads frost and produces shards on the entire group", async () => {
	const game = await scenario({
		towers: [
			{ slot: 9, kind: "frost" },
			{ slot: 8, kind: "blast" },
		],
		bonuses: { frostRelay: 1, shatter: 1 },
		enemies: [{ speed: 0 }, { speed: 0, progress: 216 }],
	});
	game.step();
	expect(game.snapshot().enemies.map((e) => e.hp)).toEqual([67, 67]);
	expect(game.snapshot().triggers.shatter).toBe(1);
});

it("shieldstorm breaks several shields and converts the last charge to an explosion", async () => {
	const game = await scenario({
		towers: [{ slot: 9, kind: "rapid" }],
		bonuses: { chain: 1, shieldBurst: 1 },
		enemies: [
			{ kind: "shield", shield: 1, speed: 0 },
			{ kind: "shield", shield: 1, progress: 216, speed: 0 },
		],
	});
	game.step();
	expect(
		game.snapshot().enemies.every((e) => e.shield === 0 && e.hp < 100),
	).toBe(true);
	expect(game.snapshot().triggers.shieldBurst).toBe(2);
});

it("capacitor releases stored hits into an enemy outside the weapon range", async () => {
	const game = await scenario({
		towers: [{ slot: 9, kind: "rapid" }],
		bonuses: { charge: 1 },
		enemies: [
			{ hp: 1000, maxHp: 1000, speed: 0, progress: 226 },
			{ progress: 320, speed: 0 },
		],
	});
	game.step(105);
	expect(game.snapshot().triggers.charge).toBe(1);
	expect(game.snapshot().enemies[1].hp).toBe(76);
});

it("acid death spreads corrosion and damage without processing a kill twice", async () => {
	const game = await scenario({
		towers: [{ slot: 9, kind: "corrode" }],
		bonuses: { acidBurst: 1 },
		enemies: [
			{ hp: 1, speed: 0, progress: 226 },
			{ speed: 0, progress: 206 },
		],
	});
	game.step();
	expect(game.snapshot()).toMatchObject({
		kills: 1,
		triggers: { acidBurst: 1 },
	});
	expect(game.snapshot().enemies[0]).toMatchObject({ hp: 80, corrosion: 0.2 });
});

it("reaper executes a wounded enemy that survives the direct hit", async () => {
	const game = await scenario({
		towers: [{ slot: 9, kind: "rapid" }],
		bonuses: { execution: 1, soulHarvest: 1 },
		enemies: [{ hp: 20, maxHp: 100, speed: 0 }],
	});
	game.step();
	expect(game.snapshot()).toMatchObject({
		kills: 1,
		harvestKills: 1,
		triggers: { execution: 1 },
	});
});

it("sentinel loses its solitude multiplier when a neighbor is built", async () => {
	const alone = await scenario({
		towers: [{ slot: 9, kind: "arcane" }],
		bonuses: { solitude: 1 },
		enemies: [{ speed: 0 }],
	});
	const crowded = await scenario({
		towers: [
			{ slot: 9, kind: "arcane" },
			{ slot: 8, kind: "amplifier" },
		],
		bonuses: { solitude: 1 },
		enemies: [{ speed: 0 }],
	});
	alone.step();
	crowded.step();
	expect(alone.snapshot().enemies[0].hp).toBeCloseTo(67.6);
	expect(crowded.snapshot().enemies[0].hp).toBe(82);
});

it("choir trades a tower slot for both attack rate and resonance damage", async () => {
	const game = await scenario({
		towers: [
			{ slot: 8, kind: "amplifier" },
			{ slot: 9, kind: "arcane" },
		],
		bonuses: { auraPower: 1 },
		enemies: [{ speed: 0 }],
	});
	game.step();
	expect(game.snapshot().enemies[0].hp).toBe(73);
	expect(game.snapshot().towers[1].cooldown).toBeCloseTo(1.1 / 1.35);
});

it("rift multiplies damage against returned chilled enemies", async () => {
	const game = await scenario({
		towers: [{ slot: 9, kind: "arcane" }],
		bonuses: { echo: 1, chill: 1 },
		enemies: [{ speed: 0, slow: 3, teleported: true }],
	});
	game.step();
	expect(game.snapshot().enemies[0].hp).toBe(59.5);
	expect(game.snapshot().triggers.echo).toBe(1);
});

it("furnace spends a command to splash nearby enemies and rejects a repeated activation", async () => {
	const game = await scenario({
		towers: [{ slot: 9, kind: "rapid" }],
		bonuses: { overdriveEcho: 1 },
		enemies: [{ speed: 0 }, { progress: 216, speed: 0 }],
	});
	expect(game.overdrive(9)).toBe(true);
	expect(game.overdrive(9)).toBe(false);
	game.step();
	expect(game.snapshot().overdrives).toBe(1);
	expect(game.snapshot().enemies.map((e) => e.hp)).toEqual([96.4, 90.4]);
	expect(game.snapshot().triggers.overdriveEcho).toBe(1);
});

it("crossfire rewards alternating attack types on the same target", async () => {
	const game = await scenario({
		towers: [
			{ slot: 8, kind: "rapid" },
			{ slot: 9, kind: "arcane" },
		],
		bonuses: { crossfire: 1 },
		enemies: [{ speed: 0 }],
	});
	game.step();
	expect(game.snapshot().enemies[0].hp).toBeCloseTo(65.2);
	expect(game.snapshot().triggers.crossfire).toBe(1);
});

it("the journal reveals only effects that actually fired", () => {
	const bonuses = {
		snowfall: 1,
		frostRelay: 1,
		chill: 1,
		shatter: 1,
		coldDeath: 1,
	} as Parameters<typeof discoveredChain>[0];
	expect(
		discoveredChain(bonuses, {
			frostRelay: 4,
			shatter: 3,
			coldDeath: 2,
		}),
	).toEqual(["frostRelay", "shatter", "coldDeath"]);
});
