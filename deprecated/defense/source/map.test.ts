import { isConstructionSite } from "@/games/defense/constructionRules";
import { generateMap } from "@/games/defense/mapGeneration";
import { expect, it, onTestFinished } from "vite-plus/test";
import {
	validMap,
	isBuildable,
	pointOnRoute,
	routeLength,
	slotsFor,
	roadProgress,
	type DefenseMap,
} from "@/games/defense/board";
import {
	createDefenseSession,
	type DefenseSession,
} from "@/games/defense/session";
import { createCombatScenario } from "@/games/defense/testkit/combatScenario";
import { InvalidSaveError } from "@/games/defense/save";

async function session(
	options: Parameters<typeof createDefenseSession>[0] = {},
) {
	const game = await createDefenseSession(options);
	onTestFinished(() => game.destroy());
	return game;
}
function battle(game: DefenseSession) {
	const state = game.snapshot();
	for (const tower of state.towers) delete tower.shots;
	return { ...state, runId: "ignored-for-gameplay-comparison" };
}
function defend(game: DefenseSession) {
	game.chooseStarter("volley");
	const map = game.snapshot().map;
	for (const cell of game
		.snapshot()
		.sites.slice(0, game.snapshot().openSites)
		.filter((cell) => isConstructionSite(map, cell, "rapid"))
		.slice(0, 3))
		expect(game.build(cell, "rapid")).toBe(true);
	game.startWave();
}

it("generates reproducible maps with two entrances, real branches and one reachable base", () => {
	const layouts = new Set<string>();
	for (let seed = 0; seed < 200; seed++) {
		const map = generateMap(String(seed));
		expect(map).toMatchObject({ columns: 11, rows: 15 });
		expect(
			slotsFor(map).filter((_, cell) => isBuildable(map, cell)).length,
		).toBeGreaterThanOrEqual(99);
		expect(map).toEqual(generateMap(String(seed)));
		expect(validMap(map)).toBe(true);
		expect(
			new Set(map.paths.map((path) => path[0].x)).size,
		).toBeGreaterThanOrEqual(2);
		expect(
			new Set(map.paths.map((path) => JSON.stringify(path.at(-1)))).size,
		).toBe(1);
		const outgoing = new Map<string, Set<string>>();
		for (const path of map.paths) {
			for (let i = 1; i < path.length; i++) {
				const key = JSON.stringify(path[i - 1]);
				if (!outgoing.has(key)) outgoing.set(key, new Set());
				outgoing.get(key)!.add(JSON.stringify(path[i]));
			}
		}
		expect([...outgoing.values()].some((edges) => edges.size >= 2)).toBe(true);
		for (let path = 0; path < map.paths.length; path++)
			expect(pointOnRoute(map, routeLength(map, path), path)).toMatchObject(
				map.paths[path].at(-1)!,
			);
		for (const path of map.paths) {
			let bends = 0;
			for (let i = 1; i < path.length; i++) {
				expect(path[i].y).toBeGreaterThanOrEqual(path[i - 1].y);
				if (
					i > 1 &&
					(path[i].x === path[i - 1].x) !== (path[i - 1].x === path[i - 2].x)
				)
					bends++;
			}
			expect(bends).toBeLessThanOrEqual(10);
		}
		layouts.add(JSON.stringify(map));
	}
	expect(layouts.size).toBeGreaterThan(80);
});

it("repeats enemy paths and rewards for a seed, including a mid-wave restore", async () => {
	const first = await session({ seed: "branching-replay" });
	const second = await session({ seed: "branching-replay" });
	defend(first);
	defend(second);
	first.step(180);
	second.step(180);
	expect(battle(first)).toEqual(battle(second));
	const state = first.snapshot();
	expect(
		new Set(state.enemies.map((enemy) => state.map.paths[enemy.path][0].x))
			.size,
	).toBe(2);
	const restored = await session({
		seed: "ignored-when-loading",
		saved: first.save(),
	});
	for (let i = 0; i < 240; i++) {
		first.step();
		restored.step();
		expect(battle(restored)).toEqual(battle(first));
	}
	first.step(3600);
	restored.step(3600);
	second.step(3840);
	expect(battle(restored)).toEqual(battle(first));
	expect(battle(second)).toEqual(battle(first));
	expect(first.snapshot().phase).toBe("reward");
	expect(first.snapshot().choices).toHaveLength(0);
	expect(first.snapshot().shop).toHaveLength(3);
});

it("isolates simultaneous maps and creates fresh seeds while allowing exact replay", async () => {
	const first = await session();
	const other = await session();
	const original = battle(first);
	expect(original.seed).not.toBe(other.snapshot().seed);
	const otherBefore = other.snapshot();
	first.restart();
	expect(first.snapshot().seed).not.toBe(original.seed);
	first.restart(original.seed);
	expect(battle(first)).toEqual(original);
	expect(other.snapshot()).toEqual(otherBefore);
	const detached = first.snapshot();
	detached.map.paths[0][0].x = -1;
	expect(battle(first)).toEqual(original);
});

it("keeps stored geometry rather than regenerating it and rejects corrupt maps and path ids", async () => {
	const game = await session({ seed: "saved-geometry" });
	defend(game);
	game.step(1);
	const stored = JSON.parse(game.save());
	stored.state.seed = "another-generator-input";
	const restored = await session({ saved: JSON.stringify(stored) });
	expect(restored.snapshot().map).toEqual(game.snapshot().map);
	expect(restored.snapshot().map).not.toEqual(generateMap(stored.state.seed));
	for (const corrupt of [
		(value: typeof stored) => {
			value.state.map.paths = [];
		},
		(value: typeof stored) => {
			value.state.map.paths[0][1].x += 1;
		},
		(value: typeof stored) => {
			value.state.enemies[0].path = 999;
		},
		(value: typeof stored) => {
			value.state.map.paths[0].splice(2, 0, value.state.map.paths[0][0]);
		},
	]) {
		const value = structuredClone(stored);
		corrupt(value);
		await expect(
			session({ saved: JSON.stringify(value) }),
		).rejects.toBeInstanceOf(InvalidSaveError);
	}
});

it("targets the enemy closest to the base across paths of different lengths", async () => {
	const map: DefenseMap = {
		columns: 7,
		rows: 10,
		paths: [
			[
				{ x: 24, y: 0 },
				{ x: 24, y: 120 },
				{ x: 168, y: 120 },
				{ x: 168, y: 480 },
			],
			[
				{ x: 312, y: 0 },
				{ x: 312, y: 72 },
				{ x: 216, y: 72 },
				{ x: 216, y: 120 },
				{ x: 168, y: 120 },
				{ x: 168, y: 480 },
			],
		],
	};
	// Replace the first path with a longer detour, keeping targets near one tower.
	map.paths[0] = [
		{ x: 24, y: 0 },
		{ x: 24, y: 216 },
		{ x: 120, y: 216 },
		{ x: 120, y: 120 },
		{ x: 168, y: 120 },
		{ x: 168, y: 480 },
	];
	const game = await createCombatScenario({
		map,
		towers: [{ slot: 10, kind: "rapid" }],
		enemies: [
			{ path: 0, progress: routeLength(map, 0) - 350, speed: 0 },
			{ path: 1, progress: routeLength(map, 1) - 330, speed: 0 },
		],
	});
	game.step();
	expect(game.snapshot().enemies.map((enemy) => enemy.hp)).toEqual([100, 94]);
});

it("only teleports enemies whose path contains both portal endpoints", async () => {
	const game = await session({ seed: "portal-branches" });
	game.chooseStarter("rift");
	const map = game.snapshot().map;
	const cells = slotsFor(map);
	const pair = cells
		.flatMap((_, entrance) => cells.map((__, exit) => ({ entrance, exit })))
		.find(({ entrance, exit }) => {
			const matches = map.paths.map((_, path) => {
				const a = roadProgress(map, entrance, path),
					b = roadProgress(map, exit, path);
				return a !== null && b !== null && a - b >= 144;
			});
			return matches.some(Boolean) && matches.some((match) => !match);
		})!;
	expect(pair).toBeDefined();
	expect(game.placePortal(pair.entrance, pair.exit)).toBe(true);
	game.startWave();
	let teleported = 0;
	for (let frame = 0; frame < 900; frame++) {
		game.step();
		for (const enemy of game
			.snapshot()
			.enemies.filter((enemy) => enemy.teleported)) {
			expect(roadProgress(map, pair.entrance, enemy.path)).not.toBeNull();
			expect(roadProgress(map, pair.exit, enemy.path)).not.toBeNull();
			teleported++;
		}
	}
	expect(teleported).toBeGreaterThan(0);
});
