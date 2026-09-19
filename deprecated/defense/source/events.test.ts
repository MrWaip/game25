import { expect, it, vi } from "vite-plus/test";
import { createDefenseSession } from "@/games/defense/session";
import { createDefenseWorld } from "@/games/defense/setup";
import { createSessionRuntime } from "@/games/defense/sessionRuntime";
import { Run } from "@/games/defense/components/runComponent";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { createEnemy } from "@/games/defense/entities/enemy";
import { routeLength } from "@/games/defense/board";
import type { DefenseEvent } from "@/games/defense/events";

it("starts once after choosing a build, and same-seed restarts get independent run IDs", async () => {
	const events: DefenseEvent[] = [];
	const game = await createDefenseSession({
		seed: "api",
		onEvent: (event) => {
			events.push(event);
		},
	});
	try {
		expect(events).toEqual([]);
		const first = game.getProgress().runId;
		game.chooseStarter("volley");
		game.chooseStarter("volley");
		game.save();
		game.pause();
		game.step(600);
		game.resume();
		expect(events.map((event) => event.type)).toEqual(["runStarted"]);
		expect(game.getProgress()).toMatchObject({
			completedWaves: 0,
			elapsedSeconds: 0,
		});
		game.restart("api");
		expect(game.getProgress().runId).not.toBe(first);
		game.chooseStarter("volley");
		expect(events).toHaveLength(2);
		expect(events[0].id).not.toBe(events[1].id);
		expect(events[0].progress.phase).toBe("prepare");
		expect(Object.isFrozen(events[0].progress)).toBe(true);
	} finally {
		await game.destroy();
	}
	game.step(120);
	expect(events).toHaveLength(2);
});

it("reports completed waves and accumulated combat time, without replay on restore", async () => {
	const assembly = await createDefenseWorld("progress");
	const run = assembly.world.getFirstComponent(Run)!;
	const events: DefenseEvent[] = [];
	const game = createSessionRuntime(assembly, {
		onEvent: (event) => {
			events.push(event);
		},
	});
	try {
		game.chooseStarter("volley");
		game.startWave();
		game.step(60);
		const seconds = game.getProgress().elapsedSeconds!;
		game.pause();
		game.step(600);
		expect(game.getProgress().elapsedSeconds).toBe(seconds);
		game.resume();
		run.remaining = 0;
		for (const { entity } of assembly.world.query(Enemy))
			assembly.world.deleteEntity(entity);
		game.step();
		expect(events.at(-1)).toMatchObject({
			type: "waveCompleted",
			progress: {
				currentWave: 1,
				completedWaves: 1,
				phase: "reward",
				coins: run.coins,
			},
		});
		const saved = game.save();
		game.step(120);
		expect(events).toHaveLength(2);
		const restoredEvents: DefenseEvent[] = [];
		const restored = await createDefenseSession({
			saved,
			onEvent: (event) => {
				restoredEvents.push(event);
			},
		});
		try {
			expect(restored.getProgress()).toEqual(game.getProgress());
			restored.step(120);
			expect(restoredEvents).toEqual([]);
			expect(restored.continue()).toBe(true);
			restored.startWave();
			restored.step(60);
			expect(restored.getProgress().elapsedSeconds).toBeGreaterThan(
				seconds + 0.9,
			);
			expect(restored.getProgress()).toMatchObject({
				currentWave: 2,
				completedWaves: 1,
			});
		} finally {
			await restored.destroy();
		}
	} finally {
		await game.destroy();
	}
});

it("reports defeat on wave 18 as 17 completed waves and gives checkpoint replays a stable event ID", async () => {
	const assembly = await createDefenseWorld("defeat");
	const run = assembly.world.getFirstComponent(Run)!;
	Object.assign(run, { phase: "wave", wave: 18, health: 1, remaining: 0 });
	const [enemy] = createEnemy("normal", 18, run.map);
	enemy.progress = routeLength(run.map) - 0.1;
	assembly.world.addEntity([enemy]);
	const events: DefenseEvent[] = [];
	const game = createSessionRuntime(assembly, {
		onEvent: (event) => {
			events.push(event);
		},
	});
	const checkpoint = game.save();
	try {
		game.step(120);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			type: "runLost",
			progress: { currentWave: 18, completedWaves: 17, health: 0 },
		});
		for (const [saved, count] of [
			[game.save(), 0],
			[checkpoint, 1],
		] as const) {
			const replay: DefenseEvent[] = [];
			const restored = await createDefenseSession({
				saved,
				onEvent: (event) => {
					replay.push(event);
				},
			});
			try {
				restored.step(120);
				expect(replay).toHaveLength(count);
				if (count) expect(replay[0].id).toBe(events[0].id);
			} finally {
				await restored.destroy();
			}
		}
	} finally {
		await game.destroy();
	}
});

it.each(["throw", "reject"])(
	"isolates listener failures (%s) from gameplay",
	async (mode) => {
		const error = new Error("host unavailable");
		const onEventError = vi.fn();
		const game = await createDefenseSession({
			onEvent: () => {
				if (mode === "throw") throw error;
				return Promise.reject(error);
			},
			onEventError,
		});
		try {
			expect(game.chooseStarter("volley")).toBe(true);
			await Promise.resolve();
			expect(onEventError).toHaveBeenCalledWith(
				error,
				expect.objectContaining({ type: "runStarted" }),
			);
			expect(game.startWave()).toBe(true);
			game.step();
			expect(game.getProgress().phase).toBe("wave");
		} finally {
			await game.destroy();
		}
	},
);
