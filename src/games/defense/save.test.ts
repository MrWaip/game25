import { classicMap } from "@/games/defense/board";
import { afterEach, expect, it } from "vite-plus/test";
import type { DefenseSession } from "@/games/defense/session";
import { createClassicSession as createDefenseSession } from "@/games/defense/testkit/classicSession";
import { InvalidSaveError } from "@/games/defense/save";

// Fixed v2 representation, independent of today's snapshot projection and writer.
const legacy = {
	version: 2,
	state: {
		seed: "legacy",
		phase: "wave",
		coins: 60,
		wave: 1,
		health: 10,
		kills: 0,
		remaining: 7,
		spawnIn: 0.5,
		choices: [],
		bonuses: {
			snowfall: 0,
			portal: 0,
			chill: 0,
			shatter: 0,
			echo: 0,
			freeze: 0,
			chain: 1,
			power: 0,
			haste: 0,
		},
		pendingWorld: null,
		snow: null,
		portal: null,
		elapsed: 0.5,
		waveKills: 0,
		waveLeaks: 0,
		teleports: 0,
		shatters: 0,
		towers: [
			{
				slot: 8,
				kind: "rapid",
				level: 1,
				cooldown: 0.2,
				shots: [{ x: 24, y: 40, life: 0.1, effect: "shot" }],
			},
		],
		enemies: [
			{
				hp: 32,
				maxHp: 32,
				speed: 85,
				kind: "normal",
				segment: 1,
				x: 24,
				y: 42.5,
				progress: 42.5,
				slow: 0,
				teleported: false,
				shield: 0,
				shieldTimer: 0,
			},
		],
	},
};
const sessions: DefenseSession[] = [];
async function session(saved?: string) {
	const game = await createDefenseSession({ saved });
	sessions.push(game);
	return game;
}
afterEach(async () => {
	await Promise.all(sessions.splice(0).map((game) => game.destroy()));
});
function battle(game: DefenseSession) {
	const state = game.snapshot();
	for (const tower of state.towers) delete tower.shots;
	return state;
}

it("reads fixed v2 saves and writes v6 without visual shot data", async () => {
	const game = await session(JSON.stringify(legacy));
	const expected = structuredClone(legacy.state);
	for (const tower of expected.towers) Reflect.deleteProperty(tower, "shots");
	const migrated = {
		...expected,
		runId: game.getProgress().runId,
		elapsedSeconds: null,
		bonuses: {
			...expected.bonuses,
			shieldBurst: 0,
			frostRelay: 0,
			conduction: 0,
			coldDeath: 0,
		},
		map: classicMap,
		enemies: expected.enemies.map((enemy) => ({ ...enemy, path: 0 })),
	};
	expect(battle(game)).toEqual(migrated);
	expect(game.snapshot().towers[0].shots).toBeUndefined();
	expect(JSON.parse(game.save())).toEqual({ version: 6, state: migrated });
});

it("keeps every battle field and future outcome when saved during a visible shot", async () => {
	const first = await session();
	first.chooseStarter("volley");
	first.build(8, "rapid");
	first.startWave();
	for (let i = 0; i < 600 && !first.snapshot().towers[0].shots?.length; i++)
		first.step();
	expect(first.snapshot().towers[0].shots?.length).toBeGreaterThan(0);
	const second = await session(first.save());
	expect(second.snapshot().towers[0].shots).toBeUndefined();
	expect(battle(second)).toEqual(battle(first));
	for (let i = 0; i < 180; i++) {
		first.step();
		second.step();
		expect(battle(second)).toEqual(battle(first));
	}
	first.step(3600);
	second.step(3600);
	expect(battle(second)).toEqual(battle(first));
});

it.each([2, 3])(
	"discards unknown and visual fields instead of assigning them to live state (v%i)",
	async (version) => {
		const raw = JSON.parse(JSON.stringify(legacy));
		raw.version = version;
		raw.state.debug = true;
		raw.state.bonuses.unreleased = 99;
		raw.state.towers[0].shots = { untrusted: "ignored visual data" };
		raw.state.towers[0].debug = true;
		raw.state.enemies[0].debug = true;
		Object.defineProperty(raw.state, "__proto__", {
			value: { debug: true },
			enumerable: true,
		});
		const game = await session(JSON.stringify(raw));
		const baseline = await session(JSON.stringify(legacy));
		expect(game.snapshot()).toEqual(baseline.snapshot());
		expect(game.save()).toBe(baseline.save());
		game.step(600);
		baseline.step(600);
		expect(game.snapshot()).toEqual(baseline.snapshot());
	},
);

it("reports invalid versions and invalid battle fields as save errors", async () => {
	for (const saved of [
		"not json",
		JSON.stringify({ ...legacy, version: 99 }),
	]) {
		await expect(session(saved)).rejects.toBeInstanceOf(InvalidSaveError);
	}
	const raw = structuredClone(legacy);
	raw.state.enemies[0].shieldTimer = -1;
	await expect(session(JSON.stringify(raw))).rejects.toBeInstanceOf(
		InvalidSaveError,
	);
});

it("upgrades a v4 generated run without changing its map or existing bonuses", async () => {
	const original = await session();
	const raw = JSON.parse(original.save());
	raw.version = 4;
	raw.state.wave = 18;
	raw.state.phase = "prepare";
	raw.state.bonuses.power = 8;
	for (const key of ["shieldBurst", "frostRelay", "conduction", "coldDeath"])
		delete raw.state.bonuses[key];
	const { generateMap } = await import("@/games/defense/mapGeneration");
	raw.state.map = generateMap("old-generated-run");
	const migrated = await session(JSON.stringify(raw));
	expect(migrated.snapshot().map).toEqual(raw.state.map);
	expect(migrated.snapshot().bonuses).toMatchObject({
		power: 8,
		shieldBurst: 0,
		frostRelay: 0,
		conduction: 0,
		coldDeath: 0,
	});
	const restored = await session(migrated.save());
	expect(restored.save()).toBe(migrated.save());
});
