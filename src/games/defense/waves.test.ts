import { expect, test } from "vite-plus/test";
import { balance } from "./config";
import { createDefenseSession } from "./session";
import {
	assaultProgress,
	totalWaves,
	waveDefinition,
	waveSpawn,
} from "./definitions/campaign";

test("every wave and chapter increases total enemy health and each assault increases pressure", () => {
	let previous = 0;
	for (let number = 1; number <= totalWaves; number++) {
		const wave = waveDefinition(number);
		let health = 0;
		for (let i = 0; i < wave.count; i++) {
			const spawn = waveSpawn(wave, i)!;
			health +=
				spawn.kind === "shieldSquad"
					? spawn.shieldHealth + spawn.health * 5
					: spawn.health;
		}
		expect(health, `wave ${number}`).toBeGreaterThan(previous);
		previous = health;
		for (let i = 1; i < wave.assaults.length; i++) {
			const before = wave.assaults[i - 1],
				after = wave.assaults[i];
			expect(after.count).toBeGreaterThan(before.count);
			expect(after.health).toBeGreaterThan(before.health);
			expect(after.interval).toBeLessThan(before.interval);
		}
	}
});

test("clearing an assault does not end the wave; its saved gap resumes once", async () => {
	const initial = await createDefenseSession({ seed: "assault-boundary" });
	initial.startWave();
	const state = initial.snapshot();
	await initial.destroy();
	const wave = waveDefinition(1);
	state.remaining = wave.count - wave.assaults[0].count;
	state.spawnIn = 4;
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-5", run: state }),
	});
	try {
		session.step(120);
		expect(session.snapshot().phase).toBe("wave");
		expect(session.snapshot().offers).toEqual([]);
		expect(session.snapshot().enemies).toEqual([]);
		const resumed = await createDefenseSession({ saved: session.save() });
		try {
			resumed.pause();
			resumed.step(240);
			expect(resumed.snapshot()).toEqual(session.snapshot());
			resumed.resume();
			session.step(122);
			resumed.step(122);
			expect(resumed.snapshot()).toEqual(session.snapshot());
			expect(session.snapshot().enemies).toHaveLength(1);
			expect(assaultProgress(1, session.snapshot().remaining).index).toBe(2);
		} finally {
			await resumed.destroy();
		}
	} finally {
		await session.destroy();
	}
});

test("three basic tower types require further investment by the third wave", async () => {
	const session = await createDefenseSession({ seed: "three-basic-towers" });
	try {
		for (let number = 1; number <= 3; number++) {
			if (!session.startWave()) break;
			for (
				let second = 0;
				second < 180 && session.getProgress().phase === "wave";
				second++
			) {
				session.build(0, "arrow");
				session.build(1, "oil");
				session.build(6, "stone");
				session.step(60);
			}
			const state = session.snapshot();
			if (state.phase !== "reward") break;
			if (state.offers.length) session.choose(state.offers[0]);
			else session.continue();
		}
		expect(session.snapshot().health).toBeLessThan(balance.health);
		expect(session.snapshot().towers).toHaveLength(3);
	} finally {
		await session.destroy();
	}
});

test("upgrading only the same three towers cannot hold both introductory chapters", async () => {
	const session = await createDefenseSession({ seed: "three-upgraded-towers" });
	try {
		for (let number = 1; number <= 6; number++) {
			if (!session.startWave()) break;
			for (
				let second = 0;
				second < 360 && session.getProgress().phase === "wave";
				second++
			) {
				session.build(0, "arrow");
				session.build(1, "oil");
				session.build(6, "stone");
				for (const slot of [0, 6, 1]) session.improve(slot);
				session.specialize(0, "fire");
				session.step(60);
			}
			const state = session.snapshot();
			if (state.phase !== "reward") break;
			if (state.offers.length) session.choose(state.offers[0]);
			else session.continue();
		}
		// The gate survives on a sliver: three towers no longer hold the pressure.
		expect(session.snapshot().health).toBeLessThan(balance.health / 10);
	} finally {
		await session.destroy();
	}
});

test("legacy in-progress saves retain enemies and scale only the unspawned tail", async () => {
	const initial = await createDefenseSession({ seed: "old-wave" });
	initial.startWave();
	initial.step();
	const state = initial.snapshot();
	await initial.destroy();
	state.remaining = 3;
	state.spawnIn = 0.75;
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-4", run: state }),
	});
	try {
		expect(session.snapshot().remaining).toBe(9);
		expect(session.snapshot().spawnIn).toBe(0.75);
		expect(session.snapshot().enemies).toEqual(state.enemies);
		const resumed = await createDefenseSession({ saved: session.save() });
		try {
			expect(resumed.snapshot()).toEqual(session.snapshot());
		} finally {
			await resumed.destroy();
		}
	} finally {
		await session.destroy();
	}
});

test("late shields hold several goblin blows and late flocks are fast, tough and many", async () => {
	const { waveDefinition, waveSpawn } = await import("./definitions/campaign");
	const { enemies } = await import("./definitions/enemies");
	const late = waveDefinition(18);
	const spawns = Array.from({ length: late.count }, (_, i) =>
		waveSpawn(late, i)!,
	);
	const squad = spawns.find((spawn) => spawn.kind === "shieldSquad")!;
	expect(squad.shieldHealth).toBeGreaterThanOrEqual(squad.health * 3);
	const flyers = spawns.filter((spawn) => spawn.kind === "flyer");
	expect(flyers.length).toBeGreaterThanOrEqual(5);
	const goblin = spawns.find(
		(spawn) => spawn.kind === "goblin" && spawn.assault === flyers[0].assault,
	)!;
	expect(flyers[0].health).toBeGreaterThan(goblin.health);
	expect(enemies.flyer.speed).toBeGreaterThan(enemies.goblin.speed);
	expect(enemies.flyer.breachDamage).toBe(2);
});
