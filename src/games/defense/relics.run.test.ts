import { expect, test } from "vite-plus/test";
import { createDefenseSession, type DefenseSnapshot } from "./session";
import type { EnemyState, RelicId } from "./model";

function goblin(id: number, distance = 245, hp = 100): EnemyState {
	return {
		id,
		kind: "goblin",
		distance,
		hp,
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
async function battle(
	relics: RelicId[],
	units: EnemyState[],
	configure: (state: DefenseSnapshot) => void = () => {},
) {
	const initial = await createDefenseSession({ seed: "relic-run" });
	initial.startWave();
	initial.build(0, "arrow");
	const state = initial.snapshot();
	await initial.destroy();
	state.towers[0].construction = 0;
	state.towers[0].constructionKind = null;
	state.enemies = units;
	state.nextId = Math.max(0, ...units.map((enemy) => enemy.id)) + 1;
	state.remaining = 0;
	state.relics = relics;
	configure(state);
	return createDefenseSession({
		saved: JSON.stringify({ version: "gdd-8", run: state }),
	});
}

test("a bridge lets the catapult pick a flyer the stones normally ignore", async () => {
	for (const relics of [[], ["bridge"] as RelicId[]]) {
		const session = await battle(
			relics,
			[{ ...goblin(1), kind: "flyer" }],
			(state) => {
				state.towers[0].kind = "stone";
			},
		);
		try {
			session.step();
			expect(session.snapshot().shots.length).toBe(relics.length ? 1 : 0);
		} finally {
			await session.destroy();
		}
	}
});

test("a mark makes every tower shoot the most wounded enemy instead of the nearest", async () => {
	const session = await battle(["mark"], [goblin(1, 275), goblin(2, 245, 20)]);
	try {
		session.step();
		expect(session.snapshot().shots[0].impact?.targetId).toBe(2);
	} finally {
		await session.destroy();
	}
});

test("an echo fires every fifth shot twice", async () => {
	const session = await battle(["echo"], [goblin(1)], (state) => {
		state.towers[0].shots = 4;
	});
	try {
		session.step();
		expect(session.snapshot().shots.length).toBe(2);
	} finally {
		await session.destroy();
	}
});

test("dry tinder keeps the fire alive and turns to ash on the fiftieth ignition", async () => {
	const { ignite, tickBurning } = await import("./effects/burning");
	const burning = goblin(1);
	burning.oil = 5;
	ignite(burning, ["tinder"]);
	tickBurning([burning], ["tinder"], 30, 1);
	expect(burning.burn).toBeGreaterThan(0);
	const run = await battle(["tinder"], [goblin(1)], (state) => {
		state.ignites = 49;
		state.enemies[0].oil = 5;
	});
	try {
		run.step();
		const { ignite: light } = await import("./effects/burning");
		const state = run.snapshot();
		light(state.enemies[0], state.relics);
		expect(state.relics).toContain("tinder");
	} finally {
		await run.destroy();
	}
});

test("a tar barrel stretches the oil and an autopsy reshapes damage around shields", async () => {
	const { applyAttack } = await import("./effects/attacks");
	const target = goblin(1);
	const run = { enemies: [target], level: 1, relics: ["tar"], shots: [] };
	applyAttack(
		{ type: "oil", radius: 10, duration: 4, slow: 0.4 },
		target,
		run as never,
	);
	expect(target.oil).toBe(6);
	const { damageEnemy } = await import("./effects/damage");
	const victim = goblin(2);
	damageEnemy(victim, 10, {
		enemies: [victim],
		level: 1,
		relics: ["autopsy"],
		shots: [],
	} as never);
	expect(victim.hp).toBe(95);
});

test("downed flyers and enemies killed while stunned are counted for their relics", async () => {
	const session = await battle(
		["fowler", "brand"],
		[
			{ ...goblin(1, 245, 1), kind: "flyer" },
			{ ...goblin(2, 250, 1), stun: 10 },
		],
	);
	try {
		for (let i = 0; i < 200; i++) session.step();
		const state = session.snapshot();
		expect(state.flyerKills).toBe(1);
		expect(state.stunKills).toBe(1);
	} finally {
		await session.destroy();
	}
});

test("a bone guard leaves the base on one health and burns itself out; a vial breaks on the same breach", async () => {
	const { pathLengthFor } = await import("./board");
	const session = await battle(
		["bones", "vial"],
		[goblin(1, pathLengthFor(1) - 1)],
		(state) => {
			state.health = 1;
		},
	);
	try {
		for (let i = 0; i < 10; i++) session.step();
		const state = session.snapshot();
		expect(state.health).toBe(1);
		expect(state.phase).not.toBe("falling");
		expect(state.relics).toEqual([]);
	} finally {
		await session.destroy();
	}
});

test("interest pays out when the wave ends and the piggy bank swallows its three coins", async () => {
	const session = await battle(["interest", "piggy"], [goblin(1, 245, 1)]);
	try {
		const before = session.snapshot().coins;
		for (let i = 0; i < 200; i++) session.step();
		const state = session.snapshot();
		expect(state.phase).toBe("reward");
		expect(state.piggyCoins).toBe(3);
		expect(state.coins).toBeGreaterThan(before);
	} finally {
		await session.destroy();
	}
});

test("discarding a piggy bank hands over everything it swallowed", async () => {
	const session = await battle(["piggy"], [], (state) => {
		state.phase = "reward";
		state.piggyCoins = 12;
		state.offers = ["chain"];
		state.relics = ["piggy", "tar", "greed", "echo", "bones"];
	});
	try {
		const before = session.snapshot().coins;
		expect(session.choose("chain", "piggy")).toBe(true);
		expect(session.snapshot().coins).toBe(before + 12);
		expect(session.snapshot().piggyCoins).toBe(0);
	} finally {
		await session.destroy();
	}
});

test("a rush raises the tower at once at half strength; a brigade rewards building under fire", async () => {
	const session = await battle(["rush", "brigade"], [goblin(1)]);
	try {
		expect(session.build(1, "arrow")).toBe(true);
		const built = session.snapshot().towers.find((t) => t.slot === 1)!;
		expect(built.construction).toBe(0);
		expect(built.rushed).toBeGreaterThan(0);
		expect(built.rate).toBe(1.25);
	} finally {
		await session.destroy();
	}
});

test("relocation costs build time again unless a nomad carries the tower", async () => {
	for (const relics of [[], ["nomad"] as RelicId[]]) {
		const session = await battle(relics, [goblin(1)]);
		try {
			expect(session.relocate(0, 2)).toBe(true);
			const moved = session.snapshot().towers[0];
			expect(moved.construction > 0).toBe(relics.length === 0);
		} finally {
			await session.destroy();
		}
	}
});

test("beheading turns a broken squad shield into a blast on everyone around it", async () => {
	const { damageEnemy } = await import("./effects/damage");
	const { shieldHealth } = await import("./definitions/enemies");
	const squad = {
		...goblin(1, 245),
		kind: "shieldSquad" as const,
		hp: 5,
		maxHp: shieldHealth,
		memberHp: 45,
	};
	const bystander = goblin(2, 250);
	const run = {
		enemies: [squad, bystander],
		level: 1,
		relics: ["behead"],
		shots: [],
		nextId: 3,
	};
	damageEnemy(squad, 10, run as never);
	expect(bystander.hp).toBeLessThan(100);
});

test("with a bridge the stone and the oil actually land on a flyer, and oiled flyers burn", async () => {
	const flyer = () => ({ ...goblin(1), kind: "flyer" as const });
	const stone = await battle(["bridge"], [flyer()], (state) => {
		state.towers[0].kind = "stone";
	});
	try {
		for (let i = 0; i < 120; i++) stone.step();
		expect(stone.snapshot().enemies[0]?.hp ?? 0).toBeLessThan(100);
	} finally {
		await stone.destroy();
	}
	const oil = await battle(["bridge"], [flyer()], (state) => {
		state.towers[0].kind = "oil";
	});
	try {
		oil.step();
		const coated = oil.snapshot().enemies[0];
		expect(coated.oil).toBeGreaterThan(0);
		expect(coated.slow).toBeGreaterThan(0);
	} finally {
		await oil.destroy();
	}
	const { ignite } = await import("./effects/burning");
	const oiled = { ...flyer(), oil: 3 };
	expect(ignite(oiled, ["bridge"])).toBe(true);
});

test("swapping two towers sends both back to the builders, unless a nomad carries them", async () => {
	for (const relics of [[], ["nomad"] as RelicId[]]) {
		const session = await battle(relics, [goblin(1)], (state) => {
			state.coins = 1000;
		});
		try {
			session.build(1, "oil");
			session.step(60 * 9);
			expect(session.relocate(0, 1)).toBe(true);
			const towers = session.snapshot().towers;
			expect(towers.map((tower) => tower.construction > 0)).toEqual(
				relics.length ? [false, false] : [true, true],
			);
		} finally {
			await session.destroy();
		}
	}
});

test("greed is a key relic and every breach burns a fifth of the treasury", async () => {
	const { relics } = await import("./definitions/relics");
	expect(relics.greed.rarity).toBe("key");
	const { pathLengthFor } = await import("./board");
	const session = await battle(
		["greed"],
		[goblin(1, pathLengthFor(1) - 1)],
		(state) => {
			state.coins = 1000;
		},
	);
	try {
		session.step(10);
		expect(session.snapshot().coins).toBe(800);
	} finally {
		await session.destroy();
	}
});

test("oil landing on a wet enemy adds a layer, and fire burns one stack per layer", async () => {
	const { applyAttack } = await import("./effects/attacks");
	const { ignite } = await import("./effects/burning");
	const target = goblin(1);
	const state = { enemies: [target], level: 1, relics: [], shots: [] };
	const oil = { type: "oil" as const, radius: 10, duration: 4, slow: 0.3 };
	applyAttack(oil, target, state as never);
	expect(target.layers).toBe(1);
	const single = target.slow;
	applyAttack(oil, target, state as never);
	applyAttack(oil, target, state as never);
	applyAttack(oil, target, state as never);
	expect(target.layers).toBe(3);
	expect(target.slow).toBeGreaterThan(single);
	expect(target.oil).toBeGreaterThan(4);
	ignite(target, []);
	expect(target.burnStacks).toBe(3);
});

test("plain oil, soak and acid add up on a wet enemy instead of wiping each other", async () => {
	const { applyAttack } = await import("./effects/attacks");
	const target = goblin(1);
	const state = { enemies: [target], level: 1, relics: [], shots: [] };
	const hit = (extra: object) =>
		applyAttack(
			{ type: "oil", radius: 10, duration: 4, slow: 0.3, ...extra },
			target,
			state as never,
		);
	hit({ acid: 6 });
	hit({ vulnerability: 1.5 });
	hit({});
	expect(target.acid).toBe(6);
	expect(target.vulnerability).toBe(1.5);
	expect(target.layers).toBe(3);
});
