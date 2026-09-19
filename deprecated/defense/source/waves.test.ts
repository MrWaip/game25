import { expect, it } from "vite-plus/test";
import { createDefenseWorld } from "@/games/defense/setup";
import { createSessionRuntime } from "@/games/defense/sessionRuntime";
import { createDefenseSession } from "@/games/defense/session";
import { Run } from "@/games/defense/components/runComponent";
import { waveAt, waveDifficulty } from "@/games/defense/waves";
import { speedAuraMultiplier } from "@/games/defense/enemyRules";
import { Enemy } from "@/games/defense/components/enemyComponent";
import { createEnemy } from "@/games/defense/entities/enemy";
import { classicMap, slotsFor, isBuildable } from "@/games/defense/board";
import { createTower } from "@/games/defense/entities/tower";

it("spawns a supportive squad on one path, rotates entrances and resumes mid-squad", async () => {
	const assembly = await createDefenseWorld("squads");
	const run = assembly.world.getFirstComponent(Run)!;
	Object.assign(run, {
		phase: "wave",
		wave: 8,
		remaining: waveAt(8).enemies.length,
	});
	const game = createSessionRuntime(assembly);
	let restored: Awaited<ReturnType<typeof createDefenseSession>> | undefined;
	try {
		game.step(10);
		restored = await createDefenseSession({ saved: game.save() });
		game.step(16);
		restored.step(16);
		expect(restored.save()).toBe(game.save());
		const first = game.snapshot().enemies;
		expect(first).toHaveLength(4);
		expect(new Set(first.map((e) => e.path)).size).toBe(1);
		expect(first.map((e) => e.kind)).toEqual([
			"tank",
			"herald",
			"wisp",
			"shield",
		]);
		const enemies = [...assembly.world.query(Enemy)].map(
			(e) => e.components[0],
		);
		expect(
			enemies.filter((e) => speedAuraMultiplier(e, enemies) > 1),
		).toHaveLength(3);
		game.step(140);
		const second = game.snapshot().enemies;
		expect(second.length).toBeGreaterThanOrEqual(5);
		expect(run.map.paths[second[4].path][0].x).not.toBe(
			run.map.paths[first[0].path][0].x,
		);
	} finally {
		await game.destroy();
		await restored?.destroy();
	}
});

it("preserves opening enemy stats and scales beyond wave eighteen without unbounded crowds or speed", () => {
	for (let wave = 1; wave <= 5; wave++) {
		const [enemy] = createEnemy("normal", wave, classicMap);
		expect(enemy.hp).toBe(Math.round(32 * (1 + (wave - 1) * 0.18)));
		expect(enemy.speed).toBe(85);
	}
	expect(waveDifficulty(18).health).toBeGreaterThan(11);
	expect(waveDifficulty(28).health).toBeGreaterThan(
		waveDifficulty(18).health * 2,
	);
	for (const wave of [18, 100, 500]) {
		expect(waveAt(wave).enemies.length).toBeLessThanOrEqual(32);
		expect(waveDifficulty(wave).speed).toBeLessThanOrEqual(1.3);
		expect(waveDifficulty(wave).spawnInterval).toBeGreaterThanOrEqual(0.3);
	}
});

it("a fixed developed defense faces more pressure in later stages", async () => {
	const results = [];
	for (const wave of [8, 18, 28]) {
		const assembly = await createDefenseWorld("balance-squads");
		const run = assembly.world.getFirstComponent(Run)!;
		Object.assign(run, {
			phase: "wave",
			wave,
			remaining: waveAt(wave).enemies.length,
		});
		Object.assign(run.bonuses, { power: 3, haste: 2, chain: 2 });
		const cells = slotsFor(run.map)
			.map((_, slot) => slot)
			.filter((slot) => isBuildable(run.map, slot));
		for (let i = 0; i < 12; i++) {
			const [tower] = createTower(
				cells[Math.floor((i * cells.length) / 12)],
				i % 2 ? "arcane" : "rapid",
			);
			tower.level = 3;
			assembly.world.addEntity([tower]);
		}
		const game = createSessionRuntime(assembly);
		try {
			game.step(7200);
			results.push(game.snapshot().waveLeaks);
		} finally {
			await game.destroy();
		}
	}
	expect(results[0]).toBe(0);
	expect(results[1]).toBeGreaterThan(0);
	expect(results[2]).toBeGreaterThan(results[0]);
});
