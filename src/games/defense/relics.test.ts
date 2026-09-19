import { expect, test } from "vite-plus/test";
import { createDefenseSession } from "./session";
import { balance } from "./config";
import type { RelicId } from "./model";

async function atReward(relics: RelicId[], offers: RelicId[]) {
	const initial = await createDefenseSession({ seed: "relic-slots" });
	initial.startWave();
	const state = initial.snapshot();
	await initial.destroy();
	state.phase = "reward";
	state.remaining = 0;
	state.enemies = [];
	state.relics = relics;
	state.offers = offers;
	return createDefenseSession({
		saved: JSON.stringify({ version: "gdd-6", run: state }),
	});
}

test("a full relic bar accepts a new relic only in exchange for an owned one", async () => {
	const slots = balance.relicSlots;
	balance.relicSlots = 1;
	const session = await atReward(["stacks"], ["chain"]);
	try {
		expect(session.choose("chain")).toBe(false);
		expect(session.choose("chain", "chain")).toBe(false);
		expect(session.choose("chain", "stacks")).toBe(true);
		expect(session.snapshot().relics).toEqual(["chain"]);
		expect(session.snapshot().offers).toEqual([]);
	} finally {
		balance.relicSlots = slots;
		await session.destroy();
	}
});

test("below the limit a relic is taken without discarding anything", async () => {
	const session = await atReward(["stacks"], ["chain"]);
	try {
		expect(session.choose("chain")).toBe(true);
		expect(session.snapshot().relics).toEqual(["stacks", "chain"]);
	} finally {
		await session.destroy();
	}
});

test("the offered relics are a random incomplete slice of what is left", async () => {
	const session = await atReward([], []);
	try {
		const { rewardOffers } = await import("./rewards");
		const state = session.snapshot();
		const offers = rewardOffers({ ...state, relics: [] } as never);
		expect(offers.length).toBeLessThanOrEqual(balance.offerCount);
		expect(new Set(offers).size).toBe(offers.length);
	} finally {
		await session.destroy();
	}
});

test("building waits for the wave: nothing can be raised or upgraded in the pause", async () => {
	const initial = await createDefenseSession({ seed: "prepare-lock" });
	initial.startWave();
	initial.build(0, "arrow");
	const state = initial.snapshot();
	await initial.destroy();
	state.phase = "prepare";
	state.remaining = 0;
	state.enemies = [];
	state.towers[0].construction = 0;
	state.towers[0].constructionKind = null;
	const session = await createDefenseSession({
		saved: JSON.stringify({ version: "gdd-7", run: state }),
	});
	try {
		expect(session.build(1, "arrow")).toBe(false);
		expect(session.improve(0)).toBe(false);
		expect(session.relocate(0, 2)).toBe(false);
		expect(session.sell(0)).toBe(false);
		expect(session.startWave()).toBe(true);
		expect(session.build(1, "arrow")).toBe(true);
		expect(session.improve(0)).toBe(true);
	} finally {
		await session.destroy();
	}
});

test("rarity weights follow the wave: the first offers are common, late ones reach the key relics", async () => {
	const { rewardOffers } = await import("./rewards");
	const { relics: pool } = await import("./definitions/relics");
	const early = [];
	const late = [];
	for (let seed = 0; seed < 40; seed++) {
		early.push(
			...rewardOffers({ seed: `w${seed}`, wave: 1, relics: [] } as never),
		);
		late.push(
			...rewardOffers({ seed: `w${seed}`, wave: 18, relics: [] } as never),
		);
	}
	const keyShare = (ids: string[]) =>
		ids.filter((id) => pool[id as RelicId].rarity === "key").length /
		ids.length;
	expect(keyShare(early)).toBe(0);
	expect(keyShare(late)).toBeGreaterThan(0.2);
});

test("the same seed and wave always offer the same relics", async () => {
	const { rewardOffers } = await import("./rewards");
	const run = { seed: "repeat", wave: 7, relics: [] } as never;
	expect(rewardOffers(run)).toEqual(rewardOffers(run));
});

test("an offer can be turned down, keeping the build exactly as it is", async () => {
	const session = await atReward(
		["stacks", "tar", "greed", "echo", "bones"],
		["chain"],
	);
	try {
		expect(session.continue()).toBe(true);
		const state = session.snapshot();
		expect(state.relics).toEqual(["stacks", "tar", "greed", "echo", "bones"]);
		expect(state.offers).toEqual([]);
		expect(state.phase).toBe("prepare");
	} finally {
		await session.destroy();
	}
});

test("an owned relic can be shifted along the bar to change its neighbour", async () => {
	const session = await atReward(["tar", "blueprint", "greed"], []);
	try {
		expect(session.shiftRelic("greed", -1)).toBe(true);
		expect(session.snapshot().relics).toEqual(["tar", "greed", "blueprint"]);
		expect(session.shiftRelic("tar", -1)).toBe(false);
		expect(session.shiftRelic("blueprint", 1)).toBe(false);
	} finally {
		await session.destroy();
	}
});
