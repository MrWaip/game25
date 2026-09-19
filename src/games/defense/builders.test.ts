import { expect, test } from "vite-plus/test";
import { createDefenseSession } from "./session";
import { balance } from "./config";
import { towers } from "./definitions/towers";

async function wave() {
	const initial = await createDefenseSession({ seed: "builders" });
	initial.startWave();
	const state = initial.snapshot();
	await initial.destroy();
	state.coins = 1000;
	return createDefenseSession({
		saved: JSON.stringify({ version: "gdd-8", run: state }),
	});
}
const seconds = (value: number) => Math.round(value * 60);

test("two builders work at once and the third order waits its turn", async () => {
	const session = await wave();
	try {
		expect(session.build(0, "arrow")).toBe(true);
		expect(session.build(1, "arrow")).toBe(true);
		expect(session.build(2, "arrow")).toBe(true);
		session.step(seconds(balance.constructionSeconds) + 1);
		const [first, second, third] = session.snapshot().towers;
		expect(first.construction).toBe(0);
		expect(second.construction).toBe(0);
		expect(third.construction).toBeGreaterThan(
			balance.constructionSeconds - 0.1,
		);
		session.step(seconds(balance.constructionSeconds) + 1);
		expect(session.snapshot().towers[2].construction).toBe(0);
	} finally {
		await session.destroy();
	}
});

test("an upgrade joins the same queue behind the orders placed before it", async () => {
	const session = await wave();
	try {
		session.build(0, "arrow");
		session.step(seconds(balance.constructionSeconds) + 1);
		session.build(1, "arrow");
		session.build(2, "arrow");
		expect(session.improve(0)).toBe(true);
		session.step(seconds(balance.constructionSeconds) + 1);
		const upgraded = session.snapshot().towers.find((t) => t.slot === 0)!;
		expect(upgraded.construction).toBeGreaterThan(
			balance.constructionSeconds - 0.1,
		);
	} finally {
		await session.destroy();
	}
});

test("the queue survives a save and a reload", async () => {
	const session = await wave();
	try {
		session.build(0, "arrow");
		session.build(1, "arrow");
		session.build(2, "arrow");
		const restored = await createDefenseSession({ saved: session.save() });
		restored.step(seconds(balance.constructionSeconds) + 1);
		expect(restored.snapshot().towers.map((t) => t.construction > 0)).toEqual([
			false,
			false,
			true,
		]);
		await restored.destroy();
	} finally {
		await session.destroy();
	}
});

test("each builder reports what it is raising and how far along it is", async () => {
	const { builderStates } = await import("./builders");
	const tower = (slot: number, order: number, construction: number) =>
		({ slot, order, construction }) as never;
	expect(builderStates([])).toEqual([{ slot: null }, { slot: null }]);
	expect(
		builderStates([tower(4, 2, 1), tower(1, 1, 3), tower(7, 3, 4)]),
	).toEqual([
		{ slot: 1, progress: 0.25, seconds: 3 },
		{ slot: 4, progress: 0.75, seconds: 1 },
	]);
});

test("progress reports the coins earned and spent over the run", async () => {
	const session = await wave();
	try {
		session.build(0, "arrow");
		session.build(1, "oil");
		expect(session.getProgress().coinsSpent).toBe(
			towers.arrow.price + towers.oil.price,
		);
		for (let i = 0; i < 60 * 60 && session.snapshot().kills === 0; i++)
			session.step();
		const progress = session.getProgress();
		expect(progress.kills).toBeGreaterThan(0);
		expect(progress.coinsEarned).toBeGreaterThan(0);
	} finally {
		await session.destroy();
	}
});
