import { waveDefinition } from "./definitions/campaign";
import { expect, test } from "vite-plus/test";
import { balance } from "./config";
import { createDefenseSession } from "./session";

test("dense waves keep entry spacing while an oiled goblin does not slow dry neighbours", async () => {
	const initial = await createDefenseSession({ seed: "crowd-spacing" });
	initial.startWave();
	const state = initial.snapshot();
	state.wave = 2;
	state.remaining = 14;
	await initial.destroy();
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-5", run: state }),
	});
	try {
		session.step(180);
		const crowded = session.snapshot();
		const ordered = crowded.enemies.toSorted((a, b) => b.distance - a.distance);
		expect(ordered.length).toBeGreaterThan(2);
		for (let i = 1; i < ordered.length; i++)
			expect(
				ordered[i - 1].distance - ordered[i].distance,
			).toBeGreaterThanOrEqual(27.99);
		ordered[0].oil = 10;
		ordered[0].slow = 0.6;
		const slowed = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-5", run: crowded }),
		});
		try {
			slowed.step(180);
			const after = slowed.snapshot();
			for (const before of crowded.enemies) {
				const moved = after.enemies.find((enemy) => enemy.id === before.id)!;
				expect(moved.distance - before.distance).toBeCloseTo(
					before.oil > 0 ? 57.6 : 144,
					4,
				);
			}
			const leader = after.enemies.find((enemy) => enemy.id === ordered[0].id)!;
			expect(
				after.enemies.some(
					(enemy) => enemy.id !== leader.id && enemy.distance > leader.distance,
				),
			).toBe(true);
			const restored = await createDefenseSession({ saved: slowed.save() });
			try {
				expect(restored.snapshot()).toEqual(after);
				restored.step(60);
				slowed.step(60);
				expect(restored.snapshot()).toEqual(slowed.snapshot());
			} finally {
				await restored.destroy();
			}
		} finally {
			await slowed.destroy();
		}
	} finally {
		await session.destroy();
	}
});

test("a run starts without a relic and only allows construction after Play", async () => {
	const session = await createDefenseSession({ seed: "gdd" });
	try {
		expect(session.snapshot().phase).toBe("ready");
		expect(session.build(0, "arrow")).toBe(false);
		expect(session.startWave()).toBe(true);
		expect(session.build(0, "arrow")).toBe(true);
		expect(session.snapshot().towers).toHaveLength(1);
		expect(session.snapshot().relics).toEqual([]);
	} finally {
		await session.destroy();
	}
});

test("construction pauses with battle and blocks attacks and consecutive upgrades", async () => {
	const session = await createDefenseSession({ seed: "construction" });
	try {
		session.startWave();
		expect(session.build(0, "arrow")).toBe(true);
		expect(session.improve(0)).toBe(false);
		session.step(120);
		const halfway = session.snapshot();
		expect(halfway.towers[0].construction).toBeCloseTo(2);
		expect(halfway.towers[0].constructionKind).toBe("build");
		expect(halfway.shots).toEqual([]);

		session.pause();
		session.step(240);
		expect(session.snapshot()).toEqual(halfway);
		session.resume();
		session.step(120);
		expect(session.snapshot().towers[0].construction).toBe(0);
		expect(session.snapshot().towers[0].constructionKind).toBeNull();
		expect(session.improve(0)).toBe(true);
		expect(session.snapshot().towers[0].constructionKind).toBe("upgrade");

		const restored = await createDefenseSession({ saved: session.save() });
		try {
			expect(restored.snapshot()).toEqual(session.snapshot());
		} finally {
			await restored.destroy();
		}
	} finally {
		await session.destroy();
	}
});

test("goblins walk to the gate and each leak removes one HP without coins", async () => {
	const initial = await createDefenseSession({ seed: "gdd" });
	initial.startWave();
	const state = initial.snapshot();
	state.remaining = 6;
	await initial.destroy();
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-5", run: state }),
	});
	try {
		session.step(3600);
		expect(session.snapshot().health).toBe(balance.health - 6);
		expect(session.snapshot().coins).toBe(180);
		expect(session.snapshot().phase).toBe("reward");
	} finally {
		await session.destroy();
	}
});

test("a shooter kills goblins automatically and immediately credits bounty", async () => {
	const session = await createDefenseSession({ seed: "gdd" });
	try {
		session.startWave();
		session.build(0, "arrow");
		session.step(600);
		expect(session.snapshot().kills).toBeGreaterThan(0);
		expect(session.snapshot().coins).toBe(
			120 + session.snapshot().kills * waveDefinition(1).bounty,
		);
		expect(session.snapshot().health).toBe(balance.health);
	} finally {
		await session.destroy();
	}
});

test("level three buys fire specialization; invalid tower selection cannot spend coins", async () => {
	const session = await createDefenseSession({ seed: "gdd" });
	try {
		session.startWave();
		session.build(0, "arrow");
		session.step(240);
		expect(session.improve(0)).toBe(true);
		expect(session.snapshot().towers[0].level).toBe(2);
		const coins = session.snapshot().coins;
		expect(session.specialize(5, "fire")).toBe(false);
		expect(session.snapshot().coins).toBe(coins);
		session.step(240);
		expect(session.specialize(0, "fire")).toBe(true);
		expect(session.snapshot().towers[0].specialization).toBe("fire");
		expect(session.snapshot().towers[0].level).toBe(3);
		expect(session.snapshot().phase).toBe("wave");
	} finally {
		await session.destroy();
	}
});

test("oil coats a nearby group and slows movement without dealing damage", async () => {
	const session = await createDefenseSession({ seed: "gdd" });
	try {
		session.startWave();
		session.build(0, "oil");
		session.step(600);
		const enemies = session.snapshot().enemies;
		expect(enemies.filter((e) => e.oil > 0).length).toBeGreaterThan(1);
		expect(enemies[0].distance).toBeLessThan(360);
		expect(enemies.every((e) => e.hp === e.maxHp)).toBe(true);
		expect(session.snapshot().kills).toBe(0);
	} finally {
		await session.destroy();
	}
});

test("an in-combat save continues the exact same simulation", async () => {
	const first = await createDefenseSession({ seed: "gdd" });
	first.startWave();
	first.build(0, "oil");
	first.build(1, "arrow");
	first.step(481);
	const second = await createDefenseSession({ saved: first.save() });
	try {
		expect(second.snapshot()).toEqual(first.snapshot());
		first.step(720);
		second.step(720);
		expect(second.snapshot()).toEqual(first.snapshot());
	} finally {
		await first.destroy();
		await second.destroy();
	}
});

test("wave rewards are free, seeded and unique; an exhausted pool never blocks play", async () => {
	let session = await createDefenseSession({ seed: "rewards" });
	const finishWave = async () => {
		const state = session.snapshot();
		state.remaining = 0;
		state.enemies = [];
		state.shots = [];
		await session.destroy();
		session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-5", run: state }),
		});
		session.step();
	};

	try {
		session.startWave();
		session.build(0, "arrow");
		session.build(1, "arrow");
		await finishWave();
		expect(session.snapshot().offers).toHaveLength(balance.offerCount);
		const saved = session.save();
		const restored = await createDefenseSession({ saved });
		expect(restored.snapshot().offers).toEqual(session.snapshot().offers);
		await restored.destroy();
		const coins = session.snapshot().coins;
		expect(session.choose(session.snapshot().offers[0])).toBe(true);
		expect(session.snapshot().coins).toBe(coins);
		session.startWave();
		await finishWave();
		expect(session.snapshot().offers).not.toContain(
			session.snapshot().relics[0],
		);
		expect(session.choose(session.snapshot().relics[0])).toBe(false);
		session.choose(session.snapshot().offers[0]);
		expect(session.snapshot().phase).toBe("prepare");
	} finally {
		await session.destroy();
	}
});

test("finishing a level extends the same field and keeps the build and damaged gate", async () => {
	const original = await createDefenseSession({ seed: "campaign" });
	original.startWave();
	original.build(0, "arrow");
	const state = original.snapshot();
	await original.destroy();
	state.wave = 3;
	state.health = 7;
	state.phase = "reward";
	state.offers = [];
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-1", run: state }),
	});
	try {
		expect(session.continue()).toBe(true);
		expect(session.snapshot().level).toBe(2);
		expect(session.snapshot().towers).toEqual(state.towers);
		expect(session.snapshot().health).toBe(7);
		expect(session.snapshot().sites.length).toBeGreaterThan(6);
		// The new ground is only buildable once the next wave is running.
		expect(session.build(6, "oil")).toBe(false);
		expect(session.startWave()).toBe(true);
		expect(session.build(6, "oil")).toBe(true);
	} finally {
		await session.destroy();
	}
});

test("the eighteenth wave wins the campaign and opens the endless run", async () => {
	const initial = await createDefenseSession({ seed: "final" });
	const state = initial.snapshot();
	await initial.destroy();
	state.phase = "reward";
	state.wave = 18;
	state.level = 6;
	state.offers = [];
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-1", run: state }),
	});
	try {
		expect(session.continue()).toBe(true);
		expect(session.snapshot().phase).toBe("won");
		expect(session.startWave()).toBe(true);
		expect(session.snapshot().wave).toBe(19);
	} finally {
		await session.destroy();
	}
});

test("zero gate HP starts the rush-in scene before defeat; restart clears the run", async () => {
	const first = await createDefenseSession({ seed: "defeat" });
	first.startWave();
	const state = first.snapshot();
	state.health = 1;
	await first.destroy();
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-1", run: state }),
	});
	try {
		for (let i = 0; i < 4000 && session.snapshot().health > 0; i++)
			session.step();
		expect(session.snapshot().phase).toBe("falling");
		expect(session.startWave()).toBe(false);
		session.step(150);
		expect(session.snapshot().phase).toBe("lost");
		session.restart("again");
		expect(session.snapshot().phase).toBe("ready");
		expect(session.snapshot().health).toBe(balance.health);
		expect(session.snapshot().wave).toBe(0);
		expect(session.snapshot().towers).toEqual([]);
	} finally {
		await session.destroy();
	}
});

test("corrupt saves fail at the loading boundary instead of entering the simulation", async () => {
	const initial = await createDefenseSession({ seed: "save" });
	const state = initial.snapshot();
	await initial.destroy();
	await expect(
		createDefenseSession({
			saved: JSON.stringify({
				version: "gdd-1",
				run: { ...state, coins: "many" },
			}),
		}),
	).rejects.toThrow("Сохранение");
	await expect(
		createDefenseSession({
			saved: JSON.stringify({
				version: "gdd-1",
				run: { ...state, phase: "shop" },
			}),
		}),
	).rejects.toThrow("Сохранение");
});

test("pause freezes simulation and commands; destroyed sessions cannot restart", async () => {
	const session = await createDefenseSession({ seed: "pause" });
	session.startWave();
	session.pause();
	const before = session.snapshot();
	session.step(120);
	expect(session.build(0, "arrow")).toBe(false);
	expect(session.restart()).toBe(false);
	expect(session.snapshot()).toEqual(before);
	session.resume();
	session.step();
	expect(session.snapshot().enemies).toHaveLength(1);
	await session.destroy();
	expect(session.restart()).toBe(false);
});

test("a newly placed tower shoots the enemy nearest the base", async () => {
	const initial = await createDefenseSession({ seed: "target" });
	initial.startWave();
	initial.step();
	const state = initial.snapshot();
	await initial.destroy();
	state.remaining = 0;
	const goblin = state.enemies[0];
	// Slot 0 is (245,140). These positions are (305,145), then (305,190).
	state.enemies = [
		{ ...goblin, id: 1, distance: 255 },
		{ ...goblin, id: 2, distance: 300 },
	];
	state.nextId = 3;
	state.towers = [
		{
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
		},
	];
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-6", run: state }),
	});
	try {
		session.step();
		expect(session.snapshot().shots[0].impact?.targetId).toBe(2);
		session.step(18);
		expect(session.snapshot().enemies[0].hp).toBe(30);
		expect(session.snapshot().enemies[1].hp).toBe(18);
	} finally {
		await session.destroy();
	}
});

test("built towers can move to a free site or swap sites without losing upgrades or paying again", async () => {
	const session = await createDefenseSession({ seed: "move" });
	try {
		session.startWave();
		session.build(0, "arrow");
		session.build(1, "oil");
		session.step(240);
		session.improve(0);
		const coins = session.snapshot().coins;
		expect(session.relocate(0, 2)).toBe(true);
		expect(session.relocate(2, 1)).toBe(true);
		expect(
			session.snapshot().towers.find((t) => t.kind === "arrow")?.slot,
		).toBe(1);
		expect(
			session.snapshot().towers.find((t) => t.kind === "arrow")?.level,
		).toBe(2);
		expect(session.snapshot().towers.find((t) => t.kind === "oil")?.slot).toBe(
			2,
		);
		expect(session.snapshot().coins).toBe(coins);
		session.pause();
		expect(session.relocate(1, 3)).toBe(false);
	} finally {
		await session.destroy();
	}
});

test("expanded regions add twelve sites and old saves retain tower ownership", async () => {
	const initial = await createDefenseSession({ seed: "old-slots" });
	initial.startWave();
	initial.build(0, "arrow");
	const state = initial.snapshot();
	state.level = 3;
	state.wave = 7;
	state.towers[0].slot = 8;
	await initial.destroy();
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-1", run: state }),
	});
	try {
		expect(session.snapshot().sites).toHaveLength(34);
		expect(session.snapshot().towers[0].slot).toBe(22);
		const reloaded = await createDefenseSession({ saved: session.save() });
		expect(reloaded.snapshot().towers[0].slot).toBe(22);
		await reloaded.destroy();
	} finally {
		await session.destroy();
	}
});

test("every build site covers a useful stretch of the actual enemy route", async () => {
	const { pointOnRoad, pathLengthFor } = await import("./board");
	const { distanceBetween } = await import("@/primitives/spatial");
	const { towers } = await import("./definitions/towers");
	const initial = await createDefenseSession({ seed: "site-coverage" });
	const saved = initial.snapshot();
	await initial.destroy();
	const range = Math.min(
		...Object.values(towers).map((tower) => tower.attacks[0].range),
	);
	for (let level = 1; level <= 6; level++) {
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-2", run: { ...saved, level } }),
		});
		try {
			for (const [slot, site] of session.snapshot().sites.entries()) {
				let covered = 0,
					nearest = Infinity;
				for (
					let distance = 0;
					distance <= pathLengthFor(level);
					distance += 5
				) {
					const separation = distanceBetween(
						site,
						pointOnRoad(distance, level),
					);
					nearest = Math.min(nearest, separation);
					if (separation <= range) covered += 5;
				}
				expect(
					nearest,
					`level ${level}, slot ${slot}: distance to road`,
				).toBeLessThanOrEqual(60.1);
				expect(
					covered,
					`level ${level}, slot ${slot}: covered path`,
				).toBeGreaterThanOrEqual(150);
			}
		} finally {
			await session.destroy();
		}
	}
});

test("kill income slows after the introductory region without removing saved coins", async () => {
	for (const wave of [1, 4, 15]) {
		const initial = await createDefenseSession({ seed: "wave-income" });
		initial.startWave();
		initial.step();
		const state = initial.snapshot();
		state.wave = wave;
		state.level = Math.ceil(wave / 3);
		state.coins = 1800;
		state.remaining = 0;
		state.enemies[0].hp = 0.01;
		state.enemies[0].burn = 1;
		state.enemies[0].burnStacks = 1;
		await initial.destroy();
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-5", run: state }),
		});
		try {
			expect(session.snapshot().coins).toBe(1800);
			session.step();
			expect(session.snapshot().kills).toBe(1);
			expect(session.snapshot().coins).toBe(1800 + waveDefinition(wave).bounty);
		} finally {
			await session.destroy();
		}
	}
});

test("selling refunds half the build and upgrade costs once and survives a save", async () => {
	const session = await createDefenseSession({ seed: "sale" });
	try {
		session.startWave();
		session.build(0, "arrow");
		session.step(240);
		session.improve(0);
		session.step(240);
		session.specialize(0, "fire");
		session.pause();
		expect(session.sell(0)).toBe(false);
		session.resume();
		const beforeSale = session.snapshot().coins;
		expect(session.sell(0)).toBe(true);
		expect(session.snapshot().coins - beforeSale).toBe(85);
		expect(session.sell(0)).toBe(false);
		const restored = await createDefenseSession({ saved: session.save() });
		try {
			expect(restored.snapshot().towers).toHaveLength(0);
			expect(restored.snapshot().coins).toBe(beforeSale + 85);
			expect(restored.build(0, "oil")).toBe(true);
		} finally {
			await restored.destroy();
		}
	} finally {
		await session.destroy();
	}
});

test("oil slows a lone goblin by 45 percent and speed recovers when it expires", async () => {
	const initial = await createDefenseSession({ seed: "oil-speed" });
	initial.startWave();
	initial.step();
	const state = initial.snapshot();
	state.remaining = 0;
	state.enemies[0].distance = 200;
	state.enemies[0].oil = 1;
	state.enemies[0].slow = 0.45;
	await initial.destroy();
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-5", run: state }),
	});
	try {
		session.step(60);
		expect(session.snapshot().enemies[0].distance - 200).toBeCloseTo(26.4, 4);
		session.step(60);
		expect(session.snapshot().enemies[0].distance - 226.4).toBeCloseTo(48, 4);
	} finally {
		await session.destroy();
	}
});
