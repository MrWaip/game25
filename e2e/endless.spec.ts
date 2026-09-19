import { test, expect } from "./fixtures";

test("victory offers an endless continuation that starts wave 19 in a new chapter", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const saved = await page.evaluate(async () => {
		const { createDefenseSession } =
			await import("/src/games/defense/session.ts");
		const { totalWaves } =
			await import("/src/games/defense/definitions/campaign.ts");
		const initial = await createDefenseSession({ seed: "endless-ui" });
		initial.startWave();
		const state = initial.snapshot();
		await initial.destroy();
		state.wave = totalWaves;
		state.completedWaves = totalWaves;
		state.phase = "reward";
		state.offers = [];
		state.remaining = 0;
		state.enemies = [];
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-6", run: state }),
		});
		session.continue();
		const saved = session.save();
		await session.destroy();
		return saved;
	});
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
	await page.getByRole("button", { name: "Продолжить забег" }).click();
	await expect(page.getByRole("group", { name: /Глава 7/ })).toBeVisible();
	await expect(page.getByRole("button", { name: "Идёт волна" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Продолжить забег" }),
	).toBeHidden();
});
