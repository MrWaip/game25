import { describe, expect, it } from "vite-plus/test";
import type { DefenseSession } from "@/games/defense/session";
import { createClassicSession as createDefenseSession } from "@/games/defense/testkit/classicSession";

async function prepared(seed = "test") {
	const game = await createDefenseSession({ seed });
	game.chooseStarter("winter");
	game.placeSnow(16);
	return game;
}
function reward(game: DefenseSession) {
	const choices = game.snapshot().choices;
	if (!choices.length) {
		expect(game.continue()).toBe(true);
		return;
	}
	const choice = choices.includes("portal") ? "portal" : choices[0];
	expect(game.choose(choice)).toBe(true);
	expect(game.choose(choice)).toBe(false);
	if (game.snapshot().pendingWorld === "portal") game.placePortal(20, 14);
	if (game.snapshot().pendingWorld === "snow") game.placeSnow(16);
	if (game.snapshot().expansionDue) game.expand("limit");
}
function defend(game: DefenseSession) {
	game.build(8, "rapid");
	game.build(13, "arcane");
	game.build(43, "blast");
}

describe("defense session", () => {
	it("routes gameplay mutations through the command interface", async () => {
		const game = await createDefenseSession({ seed: "dispatch" });
		expect(
			game.dispatch({ type: "run.chooseStarter", starter: "volley" }),
		).toBe(true);
		expect(game.dispatch({ type: "tower.build", cell: 8, kind: "rapid" })).toBe(
			true,
		);
		expect(game.dispatch({ type: "wave.start" })).toBe(true);
		expect(game.dispatch({ type: "tower.overdrive", cell: 8 })).toBe(true);
		expect(game.snapshot().towers[0]).toMatchObject({
			kind: "rapid",
			overdrive: 4,
		});
		await game.destroy();
	});

	it("spends coins on construction and prevents building during combat", async () => {
		const game = await prepared();
		expect(game.snapshot().coins).toBe(90);
		expect(game.build(8, "rapid")).toBe(true);
		expect(game.snapshot().coins).toBe(60);
		expect(game.build(8, "rapid")).toBe(false);
		expect(game.startWave()).toBe(true);
		expect(game.build(9, "frost")).toBe(false);
		await game.destroy();
	});
});

it("completes a defended wave and refills three shop offers exactly once", async () => {
	const game = await prepared();
	defend(game);
	game.startWave();
	game.step(3600);
	expect(game.snapshot().phase).toBe("reward");
	expect(game.snapshot().choices).toHaveLength(0);
	expect(game.snapshot().shop).toHaveLength(3);
	expect(new Set(game.snapshot().shop).size).toBe(3);
	const result = game.snapshot();
	game.step(600);
	expect(game.snapshot()).toEqual(result);
	await game.destroy();
});

it("can finish five waves with a mixed defense and world-changing rewards", async () => {
	const game = await prepared();
	defend(game);
	for (let wave = 1; wave <= 5; wave++) {
		expect(game.startWave()).toBe(true);
		for (
			let frame = 0;
			frame < 3600 && game.snapshot().phase === "wave";
			frame++
		) {
			const boss = game
				.snapshot()
				.enemies.find((enemy) => enemy.kind === "boss");
			if (boss && boss.x > 200 && boss.y < 200) {
				game.priority(13, "strong");
				game.overdrive(13);
			}
			if (boss && boss.y > 240) game.overdrive(43);
			game.step();
		}
		if (wave < 5) {
			expect(game.snapshot().phase).toBe("reward");
			reward(game);
			game.build(44, "frost");
			game.improve(13);
			game.improve(43);
			game.improve(8);
		}
	}
	expect(game.snapshot().phase).toBe("reward");
	reward(game);
	expect(game.startWave()).toBe(true);
	expect(game.snapshot().wave).toBe(6);
	await game.destroy();
});

it("pauses, restores a mid-wave save and reproduces the rest of the battle", async () => {
	const first = await prepared("save");
	first.build(8, "rapid");
	first.startWave();
	first.step(120);
	first.pause();
	const before = first.snapshot();
	first.step(300);
	expect(first.snapshot()).toEqual(before);
	expect(first.build(9, "frost")).toBe(false);
	const second = await createDefenseSession({ saved: first.save() });
	first.resume();
	first.step(1800);
	second.step(1800);
	expect(second.snapshot()).toEqual(first.snapshot());
	await first.destroy();
	await second.destroy();
});

it("loses an undefended run and stops accepting commands after destruction", async () => {
	const game = await prepared();
	game.startWave();
	game.step(6000);
	reward(game);
	game.startWave();
	game.step(6000);
	expect(game.snapshot().phase).toBe("lost");
	await game.destroy();
	const ended = game.snapshot();
	game.step(600);
	expect(game.startWave()).toBe(false);
	expect(game.placeSnow(0)).toBe(false);
	expect(game.snapshot()).toEqual(ended);
});

it("upgrades and relocates a tower only between waves", async () => {
	const game = await prepared();
	game.build(8, "rapid");
	expect(game.improve(8)).toBe(true);
	expect(game.snapshot().coins).toBe(25);
	expect(game.relocate(8, 1)).toBe(true);
	expect(game.snapshot().towers[0]).toMatchObject({ slot: 1, level: 2 });
	game.startWave();
	expect(game.relocate(1, 13)).toBe(false);
	expect(game.improve(1)).toBe(false);
	await game.destroy();
});

it("rejects corrupt saves, old layouts and impossible portal locations", async () => {
	await expect(createDefenseSession({ saved: "not json" })).rejects.toThrow();
	await expect(
		createDefenseSession({ saved: '{"version":1,"state":{}}' }),
	).rejects.toThrow();
	const game = await prepared();
	const saved = JSON.parse(game.save());
	saved.state.bonuses.portal = 1;
	saved.state.portal = { entrance: 8, exit: 0, cooldown: 0 };
	await expect(
		createDefenseSession({ saved: JSON.stringify(saved) }),
	).rejects.toThrow();
	await game.destroy();
});

it("rejects a reward save whose cards cannot be selected", async () => {
	const game = await prepared();
	defend(game);
	game.startWave();
	game.step(3600);
	const saved = JSON.parse(game.save());
	saved.state.choices = ["snowfall", "portal", "freeze"];
	saved.state.bonuses.portal = 1;
	saved.state.bonuses.freeze = 1;
	saved.state.portal = { entrance: 20, exit: 14, cooldown: 0 };
	await expect(
		createDefenseSession({ saved: JSON.stringify(saved) }),
	).rejects.toThrow();
	await game.destroy();
});

it("restores the initial draft, pending world placement and reward screen", async () => {
	const first = await createDefenseSession();
	const draft = await createDefenseSession({ saved: first.save() });
	expect(draft.snapshot()).toEqual(first.snapshot());
	await draft.destroy();
	first.chooseStarter("winter");
	const pending = await createDefenseSession({ saved: first.save() });
	expect(pending.snapshot().pendingWorld).toBe("snow");
	await pending.destroy();
	first.placeSnow(16);
	defend(first);
	first.startWave();
	first.step(3600);
	expect(first.snapshot().phase).toBe("reward");
	const second = await createDefenseSession({ saved: first.save() });
	const expected = first.snapshot();
	for (const tower of expected.towers) delete tower.shots;
	expect(second.snapshot()).toEqual(expected);
	await first.destroy();
	await second.destroy();
});

it("restarts a completed session without keeping towers or world effects", async () => {
	const game = await prepared();
	game.startWave();
	game.step(6000);
	reward(game);
	game.startWave();
	game.step(6000);
	expect(game.snapshot().phase).toBe("lost");
	expect(game.restart()).toBe(true);
	expect(game.snapshot()).toMatchObject({
		phase: "draft",
		towers: [],
		enemies: [],
		snow: null,
		portal: null,
		coins: 90,
		health: 10,
		wave: 0,
	});
	expect(game.chooseStarter("rift")).toBe(true);
	await game.destroy();
	expect(game.restart()).toBe(false);
});
