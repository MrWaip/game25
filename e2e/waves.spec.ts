import { test, expect } from "./fixtures";
import { writeFileSync } from "node:fs";

test("wave assaults advance in the mobile UI without an intermediate reward", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=assault-ui");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const saved = await page.evaluate(async () => {
		const entry = "/src/games/defense/session.ts";
		const { createDefenseSession } = await import(entry);
		const session = await createDefenseSession({ seed: "assault-ui" });
		session.startWave();
		const state = session.snapshot();
		await session.destroy();
		state.remaining = 14; // Four scouts have left; reinforcements are next.
		state.spawnIn = 0.5;
		return JSON.stringify({ version: "gdd-5", run: state });
	});
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
	const play = page.getByRole("button", { name: "Идёт волна", exact: true });
	await expect(play).toHaveAttribute(
		"aria-description",
		"Подкрепление · Натиск 2/3",
	);
	await expect(page.getByRole("dialog")).toBeHidden();
	await page.getByRole("button", { name: "Пауза боя", exact: true }).click();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/wave-assault.png", scale: "css" });
});

test("record introductory wave durations with an evolving real build", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const results = await page.evaluate(async () => {
		const entry = "/src/games/defense/session.ts";
		const { createDefenseSession } = await import(entry);
		const session = await createDefenseSession({ seed: "wave-duration" });
		const rows = [];
		for (let wave = 1; wave <= 3; wave++) {
			const start = session.getProgress().elapsedSeconds;
			session.startWave();
			for (
				let seconds = 0;
				seconds < 180 && session.getProgress().phase === "wave";
				seconds++
			) {
				const state = session.snapshot();
				for (const tower of state.towers) {
					session.improve(tower.slot);
					if (tower.kind === "arrow") session.specialize(tower.slot, "fire");
				}
				for (let slot = 0; slot < 10; slot++)
					session.build(
						slot,
						slot === 1 ? "oil" : slot === 6 ? "stone" : "arrow",
					);
				session.step(60);
			}
			const state = session.snapshot();
			rows.push({
				wave,
				seconds: Math.round(state.elapsedSeconds - start),
				hp: state.health,
				towers: state.towers.length,
				coins: state.coins,
				phase: state.phase,
			});
			if (state.phase !== "reward") break;
			if (state.offers.length) session.choose(state.offers[0]);
			else session.continue();
		}
		await session.destroy();
		return rows;
	});
	writeFileSync(
		"test-results/wave-balance.json",
		JSON.stringify(results, null, 2),
	);
	expect(results).toHaveLength(3);
	for (const row of results) {
		expect(row.phase).toBe("reward");
		expect(row.seconds).toBeGreaterThanOrEqual(row.wave === 1 ? 30 : 60);
		expect(row.seconds).toBeLessThanOrEqual(90);
	}
});
