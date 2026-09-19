import { expect, it } from "vite-plus/test";
import { createCombatScenario as scenario } from "@/games/defense/testkit/combatScenario";

it("awards a kill once when two towers can finish the same enemy", async () => {
	const game = await scenario({
		towers: [8, 9].map((slot) => ({
			slot,
			kind: "rapid",
		})),
		enemies: [{ hp: 5 }],
	});
	game.step();
	expect(game.snapshot()).toMatchObject({ kills: 1, coins: 92, enemies: [] });
});

it("combines frost and brittle damage on a shared target", async () => {
	const game = await scenario({
		bonuses: { chill: 1 },
		towers: [
			{ slot: 8, kind: "frost" },
			{ slot: 9, kind: "rapid" },
		],
		enemies: [{}],
	});
	game.step();
	// Frost: 3 × 1.5; rapid: 6 × 1.5. Total 13.5 damage.
	expect(game.snapshot().enemies[0].hp).toBe(86.5);
	expect(game.snapshot().enemies[0].slow).toBe(2);
});

it("chains shots and prioritizes the enemy nearest the base", async () => {
	const game = await scenario({
		bonuses: { chain: 1 },
		towers: [{ slot: 9, kind: "rapid" }],
		enemies: [0, 10, 20].map((offset) => ({
			progress: 206 + offset,
		})),
	});
	game.step();
	expect(game.snapshot().enemies.map((e) => e.hp)).toEqual([100, 94, 94]);
});

it("expires slowing and returns to normal movement speed", async () => {
	const game = await scenario({
		enemies: [{ slow: 1 / 60 }],
	});
	game.step();
	const slowed = game.snapshot().enemies[0];
	game.step();
	expect(slowed.slow).toBe(0);
	expect(game.snapshot().enemies[0].x - slowed.x).toBeCloseTo(50 / 60);
});

it("armor resists physical attacks while a magic tower bypasses it", async () => {
	const physical = await scenario({
		towers: [{ slot: 9, kind: "rapid" }],
		enemies: [{ kind: "tank" }],
	});
	const magic = await scenario({
		towers: [{ slot: 9, kind: "arcane" }],
		enemies: [{ kind: "tank" }],
	});
	physical.step();
	magic.step();
	expect(physical.snapshot().enemies[0].hp).toBeCloseTo(97.9);
	expect(magic.snapshot().enemies[0].hp).toBe(82);
});

it("shield charges absorb whole hits and frost until they are broken", async () => {
	const game = await scenario({
		towers: [{ slot: 9, kind: "frost" }],
		enemies: [{ kind: "shield", shield: 1 }],
	});
	game.step();
	expect(game.snapshot().enemies[0]).toMatchObject({
		hp: 100,
		shield: 0,
		slow: 0,
	});
	game.step(60);
	expect(game.snapshot().enemies[0].hp).toBeLessThan(100);
	expect(game.snapshot().enemies[0].slow).toBeGreaterThan(0);
});

it("snow enables mortar shards and echo amplifies damage after a teleport", async () => {
	const game = await scenario({
		bonuses: { snowfall: 1, shatter: 1, echo: 1 },
		snow: 16,
		towers: [{ slot: 9, kind: "blast" }],
		enemies: [{ teleported: true }],
	});
	game.step();
	// Physical blast 18 × 1.5, then magic shards 12 × 1.5.
	expect(game.snapshot().enemies[0].hp).toBe(55);
	expect(game.snapshot().shatters).toBe(1);
});

it("snow slows allied weapons until eternal frost removes the penalty", async () => {
	const make = (freeze: number) =>
		scenario({
			bonuses: { snowfall: 1, freeze },
			snow: 9,
			towers: [{ slot: 9, kind: "rapid" }],
			enemies: [{}],
		});
	const cold = await make(0),
		adapted = await make(1);
	cold.step();
	adapted.step();
	expect(cold.snapshot().towers[0].cooldown).toBeCloseTo(0.5);
	expect(adapted.snapshot().towers[0].cooldown).toBeCloseTo(0.4);
});

it("exposes detached snapshots so rendering cannot change the battle", async () => {
	const game = await scenario({
		towers: [{ slot: 9, kind: "rapid" }],
		enemies: [{}],
	});
	game.step();
	const original = JSON.stringify(game.snapshot());
	game.snapshot().towers[0].shots![0].x = 9999;
	expect(JSON.stringify(game.snapshot())).toBe(original);
});

it("magic resistance reduces arcane damage without blocking physical hits", async () => {
	const game = await scenario({
		towers: [
			{ slot: 9, kind: "arcane" },
			{ slot: 8, kind: "rapid" },
		],
		enemies: [{ kind: "wisp" }],
	});
	game.step();
	expect(game.snapshot().enemies[0].hp).toBeCloseTo(88.6); // 18 × 0.3 + 6.
});

it("a herald accelerates nearby allies and the boss periodically restores shields", async () => {
	const game = await scenario({
		enemies: [
			{ kind: "herald" },
			{ progress: 226 },
			{ kind: "boss", progress: 346, shield: 0, shieldTimer: 1 / 60 },
		],
	});
	game.step();
	expect(game.snapshot().enemies[0].progress - 206).toBeCloseTo(50 / 60);
	expect(game.snapshot().enemies[1].progress - 226).toBeCloseTo(65 / 60);
	expect(game.snapshot().enemies[2]).toMatchObject({
		shield: 4,
		shieldTimer: 6,
	});
});

it("frost area prepares a whole group for mortar shards", async () => {
	const game = await scenario({
		bonuses: { frostRelay: 1, shatter: 1 },
		towers: [
			{ slot: 9, kind: "frost" },
			{ slot: 8, kind: "blast" },
		],
		enemies: [{ progress: 206 }, { progress: 216 }],
	});
	game.step();
	expect(game.snapshot().enemies.map((e) => e.hp)).toEqual([67, 67]);
	expect(game.snapshot().enemies.every((e) => e.slow > 0)).toBe(true);
	expect(game.snapshot().shatters).toBe(1);
});

it("breaking a shield detonates once and does not recursively detonate nearby shields", async () => {
	const game = await scenario({
		bonuses: { shieldBurst: 1 },
		towers: [{ slot: 9, kind: "rapid" }],
		enemies: [
			{ kind: "shield", shield: 1, progress: 226 },
			{ kind: "shield", shield: 1, progress: 216 },
			{ hp: 10, progress: 206 },
		],
	});
	game.step();
	expect(game.snapshot()).toMatchObject({ kills: 1, coins: 92 });
	expect(
		game.snapshot().enemies.map((e) => ({ hp: e.hp, shield: e.shield })),
	).toEqual([
		{ hp: 82, shield: 0 },
		{ hp: 100, shield: 0 },
	]);
});

it("a chilled primary target conducts magic through ricochets", async () => {
	for (const slow of [0, 2]) {
		const game = await scenario({
			bonuses: { chain: 1, conduction: 2 },
			towers: [{ slot: 9, kind: "rapid" }],
			enemies: [{ progress: 226, slow }, { progress: 216 }],
		});
		game.step();
		expect(game.snapshot().enemies.map((e) => e.hp)).toEqual(
			slow ? [74, 74] : [94, 94],
		);
	}
});

it("killing a chilled enemy passes slow only to living nearby enemies", async () => {
	const game = await scenario({
		bonuses: { coldDeath: 1 },
		towers: [{ slot: 9, kind: "rapid" }],
		enemies: [
			{ progress: 226, hp: 5, slow: 2 },
			{ progress: 216 },
			{ progress: 20 },
		],
	});
	game.step();
	expect(game.snapshot()).toMatchObject({ kills: 1, coins: 92 });
	expect(game.snapshot().enemies.map((e) => e.slow)).toEqual([2, 0]);
});
