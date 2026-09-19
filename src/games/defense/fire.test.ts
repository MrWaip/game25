import { expect, test } from "vite-plus/test";
import { createDefenseSession } from "./session";
import type { EnemyState, RelicId } from "./model";

async function battle(oiled: boolean, relics: RelicId[] = [], group = false) {
	const initial = await createDefenseSession({ seed: "fire-scenario" });
	initial.startWave();
	initial.build(0, "arrow");
	const state = initial.snapshot();
	await initial.destroy();
	state.towers[0].level = 3;
	state.towers[0].specialization = "fire";
	state.towers[0].construction = 0;
	state.towers[0].constructionKind = null;
	const enemy: EnemyState = {
		id: 1,
		kind: "goblin",
		distance: 245,
		hp: 200,
		maxHp: 200,
		oil: oiled ? 5 : 0,
		layers: oiled ? 1 : 0,
		slow: 0.45,
		acid: 0,
		vulnerability: 1,
		stun: 0,
		burn: 0,
		burnStacks: 0,
		spreadIn: 0,
	};
	state.enemies = [enemy];
	if (group) state.enemies.push({ ...enemy, id: 2, distance: 220 });
	state.remaining = 0;
	state.nextId = 3;
	state.relics = relics;
	return createDefenseSession({
		saved: JSON.stringify({ version: "gdd-6", run: state }),
	});
}

test("fire arrows ignite only oiled targets and burning deals damage between shots", async () => {
	const oil = await battle(true);
	const dry = await battle(false);
	try {
		oil.step(19);
		dry.step(19);
		expect(oil.snapshot().enemies[0].burn).toBeGreaterThan(0);
		expect(dry.snapshot().enemies[0].burn).toBe(0);
		const hp = oil.snapshot().enemies[0].hp;
		oil.step(10);
		expect(oil.snapshot().enemies[0].hp).toBeLessThan(hp);
	} finally {
		await oil.destroy();
		await dry.destroy();
	}
});

test("the stacking relic raises burning to three stacks while ordinary fire stays at one", async () => {
	const stacked = await battle(true, ["stacks"]);
	const normal = await battle(true);
	try {
		stacked.step(100);
		normal.step(100);
		expect(stacked.snapshot().enemies[0].burnStacks).toBe(3);
		expect(normal.snapshot().enemies[0].burnStacks).toBe(1);
		expect(stacked.snapshot().enemies[0].hp).toBeLessThan(
			normal.snapshot().enemies[0].hp,
		);
	} finally {
		await stacked.destroy();
		await normal.destroy();
	}
});

test("only the chain relic ignites a nearby oiled enemy without a direct arrow hit", async () => {
	const chain = await battle(true, ["chain"], true);
	const normal = await battle(true, [], true);
	try {
		chain.step(20);
		normal.step(20);
		expect(chain.snapshot().enemies[1].burn).toBeGreaterThan(0);
		expect(chain.snapshot().enemies[1].hp).toBeLessThan(200);
		expect(normal.snapshot().enemies[1].burn).toBe(0);
		expect(normal.snapshot().enemies[1].hp).toBe(200);
	} finally {
		await chain.destroy();
		await normal.destroy();
	}
});

test("arrow damage waits for arrival and an in-flight save cannot apply it twice", async () => {
	const session = await battle(false);
	session.step();
	expect(session.snapshot().enemies[0].hp).toBe(200);
	expect(session.snapshot().shots[0].hitTargetId).toBeUndefined();
	const resumed = await createDefenseSession({ saved: session.save() });
	try {
		resumed.step(18);
		expect(resumed.snapshot().enemies[0].hp).toBe(188);
		expect(resumed.snapshot().shots[0].hitTargetId).toBe(1);
		resumed.step(3);
		expect(resumed.snapshot().enemies[0].hp).toBe(188);
	} finally {
		await session.destroy();
		await resumed.destroy();
	}
});
