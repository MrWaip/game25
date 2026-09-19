import { expect, it } from "vite-plus/test";
import { createClassicSession as createDefenseSession } from "@/games/defense/testkit/classicSession";

it("starts with a build-defining choice and only builds outside the road", async () => {
	const game = await createDefenseSession();
	expect(game.snapshot().phase).toBe("draft");
	expect(game.startWave()).toBe(false);
	expect(game.chooseStarter("winter")).toBe(true);
	expect(game.snapshot().pendingWorld).toBe("snow");
	expect(game.startWave()).toBe(false);
	expect(game.placeSnow(16)).toBe(true);
	expect(game.build(14, "rapid")).toBe(false); // Road, row 3 column 1.
	expect(game.build(8, "rapid")).toBe(true);
	expect(game.build(8, "blast")).toBe(false);
	expect(game.relocate(8, 15)).toBe(false);
	expect(game.relocate(8, 1)).toBe(true);
	expect(game.chooseStarter("rift")).toBe(false);
	expect(game.startWave()).toBe(true);
	expect(game.placeSnow(17)).toBe(false);
	await game.destroy();
});

it("swaps occupied cells for free and disallows swapping during a wave", async () => {
	const game = await createDefenseSession();
	game.chooseStarter("volley");
	game.build(8, "rapid");
	game.build(1, "arcane");
	expect(game.relocate(8, 1)).toBe(true);
	expect(game.snapshot().towers).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ slot: 1, kind: "rapid" }),
			expect.objectContaining({ slot: 8, kind: "arcane" }),
		]),
	);
	expect(game.snapshot().coins).toBe(30);
	game.startWave();
	expect(game.relocate(1, 8)).toBe(false);
	await game.destroy();
});

it("sells for half the investment and replaces atomically with the same penalty", async () => {
	const game = await createDefenseSession();
	game.chooseStarter("volley");
	game.build(8, "rapid");
	game.improve(8);
	expect(game.snapshot().coins).toBe(25);
	expect(game.sell(8)).toBe(true);
	expect(game.snapshot().coins).toBe(57); // (30 + 35) / 2, rounded down.
	game.build(8, "rapid");
	expect(game.replace(8, "arcane")).toBe(true);
	expect(game.snapshot().coins).toBe(12);
	expect(game.snapshot().towers[0]).toMatchObject({ kind: "arcane", level: 1 });
	const before = game.snapshot();
	expect(game.replace(8, "blast")).toBe(false); // 12 + 15 cannot buy a 30-coin tower.
	expect(game.snapshot()).toEqual(before);
	game.startWave();
	expect(game.sell(8)).toBe(false);
	await game.destroy();
});

it("snow slows enemies and its location survives a mid-wave save", async () => {
	const winter = await createDefenseSession();
	const plain = await createDefenseSession();
	winter.chooseStarter("winter");
	winter.placeSnow(0);
	plain.chooseStarter("volley");
	winter.startWave();
	plain.startWave();
	winter.step(60);
	plain.step(60);
	expect(winter.snapshot().enemies[0].progress).toBeLessThan(
		plain.snapshot().enemies[0].progress * 0.7,
	);
	const restored = await createDefenseSession({ saved: winter.save() });
	winter.step(240);
	restored.step(240);
	expect(restored.snapshot()).toEqual(winter.snapshot());
	await Promise.all([winter.destroy(), plain.destroy(), restored.destroy()]);
});

it("portals accept only a backward road pair, have a cooldown and cannot loop an enemy", async () => {
	const game = await createDefenseSession();
	game.chooseStarter("rift");
	expect(game.placePortal(8, 0)).toBe(false);
	expect(game.placePortal(0, 16)).toBe(false);
	expect(game.placePortal(15, 14)).toBe(false);
	expect(game.placePortal(16, 0)).toBe(true);
	game.startWave();
	game.step(300);
	expect(game.snapshot().teleports).toBeGreaterThan(0);
	expect(game.snapshot().teleports).toBeLessThanOrEqual(2);
	expect(game.snapshot().enemies.some((e) => e.teleported)).toBe(true);
	const resumed = await createDefenseSession({ saved: game.save() });
	game.step(1800);
	resumed.step(1800);
	expect(resumed.snapshot()).toEqual(game.snapshot());
	expect(game.snapshot().teleports).toBeLessThanOrEqual(8);
	await Promise.all([game.destroy(), resumed.destroy()]);
});
