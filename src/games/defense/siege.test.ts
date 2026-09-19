import { expect, test } from "vite-plus/test";
import { balance } from "./config";
import { pathLengthFor } from "./board";
import { createDefenseSession, type DefenseSnapshot } from "./session";
import type { EnemyState, TowerKind } from "./model";
import { shieldHealth } from "./definitions/enemies";
import { waveDefinition, waveSpawn } from "./definitions/campaign";

function goblin(id: number, distance = 245): EnemyState {
	return {
		id,
		kind: "goblin",
		distance,
		hp: 100,
		maxHp: 100,
		oil: 0,
		layers: 0,
		slow: 0,
		acid: 0,
		vulnerability: 1,
		stun: 0,
		burn: 0,
		burnStacks: 0,
		spreadIn: 0,
	};
}
function squad(id: number, distance = 245, hp = shieldHealth): EnemyState {
	return {
		...goblin(id, distance),
		kind: "shieldSquad",
		hp,
		maxHp: shieldHealth,
		memberHp: 45,
	};
}
async function battle(
	kind: TowerKind | null,
	units: EnemyState[],
	configure: (state: DefenseSnapshot) => void = () => {},
) {
	const initial = await createDefenseSession({ seed: "siege" });
	initial.startWave();
	if (kind) initial.build(0, kind);
	const state = initial.snapshot();
	await initial.destroy();
	if (state.towers[0]) {
		state.towers[0].construction = 0;
		state.towers[0].constructionKind = null;
	}
	state.enemies = units;
	state.nextId = Math.max(0, ...units.map((enemy) => enemy.id)) + 1;
	state.remaining = 0;
	configure(state);
	return createDefenseSession({
		saved: JSON.stringify({ version: "gdd-6", run: state }),
	});
}

test("stone prefers shields in range; arrows prefer the enemy nearest the gate", async () => {
	for (const kind of ["stone", "arrow"] as const) {
		const session = await battle(kind, [
			goblin(1, 275),
			squad(2, 245),
			squad(3, 230),
			squad(4, 600),
		]);
		try {
			session.step();
			expect(session.snapshot().shots[0].impact?.targetId).toBe(
				kind === "stone" ? 2 : 1,
			);
		} finally {
			await session.destroy();
		}
	}
});

test("oil skips shields, including in splash, and chain fire cannot ignite them", async () => {
	const session = await battle(
		"oil",
		[squad(1, 265), goblin(2, 245)],
		(state) => {
			state.relics = ["chain"];
			state.enemies[1].burn = 4;
			state.enemies[1].burnStacks = 1;
		},
	);
	const onlyShield = await battle("oil", [squad(1)]);
	try {
		session.step(60);
		onlyShield.step(60);
		const [shield, ordinary] = session.snapshot().enemies;
		expect(shield.oil).toBe(0);
		expect(shield.burn).toBe(0);
		expect(shield.hp).toBe(shieldHealth);
		expect(shield.distance).toBeCloseTo(313);
		expect(ordinary.oil).toBeGreaterThan(0);
		expect(onlyShield.snapshot().shots).toHaveLength(0);
	} finally {
		await session.destroy();
		await onlyShield.destroy();
	}
});

test("a stone homes slowly, hits the area once, and resumes identically in flight", async () => {
	const session = await battle("stone", [
		squad(1),
		goblin(2, 265),
		goblin(3, 550),
	]);
	let resumed: Awaited<ReturnType<typeof createDefenseSession>> | undefined;
	try {
		session.step(20);
		expect(session.snapshot().enemies[0].hp).toBe(shieldHealth);
		expect(session.snapshot().shots[0].to).not.toEqual(
			session.snapshot().shots[0].from,
		);
		resumed = await createDefenseSession({ saved: session.save() });
		session.step(25);
		resumed.step(25);
		expect(resumed.snapshot()).toEqual(session.snapshot());
		expect(session.snapshot().enemies.map((enemy) => enemy.hp)).toEqual([
			72, 76, 100,
		]);
		session.step(10);
		expect(session.snapshot().enemies.map((enemy) => enemy.hp)).toEqual([
			72, 76, 100,
		]);
	} finally {
		await session.destroy();
		await resumed?.destroy();
	}
});

test("two stones break the shield into five unharmed goblins without a bounty", async () => {
	const session = await battle("stone", [squad(1, 200)]);
	try {
		const coins = session.snapshot().coins;
		session.step(190);
		expect(session.snapshot().enemies[0]).toMatchObject({
			kind: "shieldSquad",
			hp: 72,
		});
		session.step(72);
		const state = session.snapshot();
		expect(state.enemies).toHaveLength(5);
		expect(
			state.enemies.every(
				(enemy) => enemy.kind === "goblin" && enemy.hp === 45,
			),
		).toBe(true);
		expect(new Set(state.enemies.map((enemy) => enemy.id)).size).toBe(5);
		expect(state.coins).toBe(coins);
		expect(state.kills).toBe(0);
		expect(state.shots.some((shot) => shot.sprite === "shieldBreak")).toBe(
			true,
		);
		const resumed = await createDefenseSession({ saved: session.save() });
		try {
			session.step(100);
			resumed.step(100);
			expect(resumed.snapshot()).toEqual(session.snapshot());
		} finally {
			await resumed.destroy();
		}
	} finally {
		await session.destroy();
	}
});

test("one blast damages each shared shield once and does not hit released members", async () => {
	const session = await battle("stone", [
		squad(1, 245, 50),
		squad(2, 265, 50),
		goblin(3, 280),
	]);
	try {
		session.step(45);
		const state = session.snapshot();
		expect(state.enemies).toHaveLength(11);
		expect(
			state.enemies
				.filter((enemy) => enemy.id !== 3)
				.every((enemy) => enemy.hp === 45),
		).toBe(true);
		expect(state.enemies.find((enemy) => enemy.id === 3)?.hp).toBe(76);
		expect(state.kills).toBe(0);
	} finally {
		await session.destroy();
	}
});

test("arrows can break a shield, with no damage overflowing onto goblins", async () => {
	const session = await battle("arrow", [squad(1, 245, 10)]);
	try {
		session.step(20);
		expect(session.snapshot().enemies).toHaveLength(5);
		expect(session.snapshot().enemies.every((enemy) => enemy.hp === 45)).toBe(
			true,
		);
	} finally {
		await session.destroy();
	}
});

test("intact squads breach for five HP without a kill reward", async () => {
	const session = await battle(null, [squad(1, pathLengthFor(1) - 1)]);
	try {
		session.step(3);
		expect(session.snapshot().health).toBe(balance.health - 5);
		expect(session.snapshot().coins).toBe(180);
		expect(session.snapshot().kills).toBe(0);
	} finally {
		await session.destroy();
	}
});

test("a stone whose target died still hits nearby enemies at the last position", async () => {
	const session = await battle("stone", [goblin(1, 265), goblin(2, 245)]);
	try {
		session.step(20);
		const state = session.snapshot();
		state.enemies = state.enemies.filter((enemy) => enemy.id !== 1);
		const resumed = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-6", run: state }),
		});
		try {
			resumed.step(25);
			expect(resumed.snapshot().enemies[0].hp).toBe(76);
		} finally {
			await resumed.destroy();
		}
	} finally {
		await session.destroy();
	}
});

test("released goblins give five ordinary kill rewards and no shield reward", async () => {
	const session = await battle("stone", [squad(1, 200, 1)], (state) => {
		state.enemies[0].memberHp = 20;
	});
	try {
		const coins = session.snapshot().coins;
		session.step(262);
		expect(session.snapshot().enemies).toHaveLength(0);
		expect(session.snapshot().kills).toBe(5);
		expect(session.snapshot().coins).toBe(coins + 5 * waveDefinition(1).bounty);
	} finally {
		await session.destroy();
	}
});

test("wave three spawns the first squad and preserves its schedule on reload", async () => {
	expect(waveDefinition(1).assaults.every((part) => !part.squads.length)).toBe(
		true,
	);
	expect(waveDefinition(2).assaults.every((part) => !part.squads.length)).toBe(
		true,
	);
	const wave = waveDefinition(3);
	const session = await battle(null, [], (state) => {
		state.wave = 3;
		const firstShield = Array.from({ length: wave.count }, (_, i) => i).find(
			(i) => waveSpawn(wave, i)?.kind === "shieldSquad",
		)!;
		state.remaining = wave.count - firstShield;
	});
	try {
		session.step();
		expect(session.snapshot().enemies[0]).toMatchObject({
			kind: "shieldSquad",
			hp: 221,
			memberHp: 69,
		});
		const resumed = await createDefenseSession({ saved: session.save() });
		try {
			session.step(300);
			resumed.step(300);
			expect(resumed.snapshot()).toEqual(session.snapshot());
		} finally {
			await resumed.destroy();
		}
	} finally {
		await session.destroy();
	}
});

function flyer(id: number, distance = 245): EnemyState {
	return { ...goblin(id, distance), kind: "flyer" };
}

test("only arrows engage a flyer; oil and stone ignore it even in splash", async () => {
	const arrow = await battle("arrow", [flyer(1)]);
	const oil = await battle("oil", [flyer(1)]);
	const stone = await battle("stone", [flyer(1, 250), goblin(2, 245)]);
	try {
		arrow.step(30);
		oil.step(60);
		stone.step(60);
		expect(arrow.snapshot().enemies[0].hp).toBeLessThan(100);
		expect(oil.snapshot().shots).toHaveLength(0);
		expect(oil.snapshot().enemies[0].oil).toBe(0);
		const hit = stone.snapshot().enemies;
		expect(hit[0]).toMatchObject({ kind: "flyer", hp: 100 });
		expect(hit[1].hp).toBeLessThan(100);
	} finally {
		await arrow.destroy();
		await oil.destroy();
		await stone.destroy();
	}
});

test("flyers join from the fourth wave and never share a slot with a squad", async () => {
	const kinds = (waveNumber: number) => {
		const wave = waveDefinition(waveNumber);
		return Array.from(
			{ length: wave.count },
			(_, index) => waveSpawn(wave, index)!.kind,
		);
	};
	for (let waveNumber = 1; waveNumber <= 3; waveNumber++)
		expect(kinds(waveNumber)).not.toContain("flyer");
	expect(kinds(4)).toContain("flyer");
	for (const wave of [4, 9, 18])
		for (const assault of waveDefinition(wave).assaults)
			expect(
				assault.flyers.filter((slot) => assault.squads.includes(slot)),
			).toEqual([]);
});

test("projectiles still in the air fade out after the wave is won", async () => {
	const session = await battle("arrow", [goblin(1, 245)], (state) => {
		state.enemies[0].hp = 1;
	});
	try {
		for (let i = 0; i < 600 && session.snapshot().phase === "wave"; i++)
			session.step();
		expect(session.snapshot().phase).toBe("reward");
		session.step(120);
		expect(session.snapshot().shots).toEqual([]);
	} finally {
		await session.destroy();
	}
});

test("the road ends at the castle wall and a breach bursts against it", async () => {
	const { pointOnRoad } = await import("./board");
	const end = pointOnRoad(pathLengthFor(1), 1);
	expect(end.y).toBeLessThanOrEqual(445);
	const session = await battle(null, [goblin(1, pathLengthFor(1) - 1)]);
	try {
		session.step(10);
		const state = session.snapshot();
		expect(state.health).toBe(balance.health - 1);
		expect(state.shots.some((shot) => shot.sprite === "breach")).toBe(true);
	} finally {
		await session.destroy();
	}
});
