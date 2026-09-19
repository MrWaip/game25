import { expect, test, type Page } from "@playwright/test";

async function lateChapter(page: Page, fortified: boolean) {
	await page.goto("/?game=defense");
	await page.getByRole("button", { name: "Плей", exact: true }).waitFor();
	const saved = await page.evaluate(async (fortified) => {
		const { createDefenseSession } =
			await import("/src/games/defense/session.ts");
		const initial = await createDefenseSession({ seed: "late-chapter" });
		const state = initial.snapshot();
		await initial.destroy();
		Object.assign(state, {
			wave: 17,
			level: 6,
			phase: "prepare",
			coins: 5000,
			relics: ["chain", "stacks", "whetstone", "echo"],
		});
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-8", run: state }),
		});
		session.startWave();
		if (fortified)
			for (let slot = 0; slot < 24; slot++)
				session.build(slot, (["arrow", "oil", "stone"] as const)[slot % 3]);
		session.step(60 * 12);
		const saved = session.save();
		await session.destroy();
		return saved;
	}, fortified);
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
	await page.waitForTimeout(800);
}

test("a late wave on the full six-chapter map keeps a smooth frame rate", async ({
	page,
}) => {
	await lateChapter(page, true);
	const frames = await page.evaluate(
		() =>
			new Promise<number[]>((resolve) => {
				const deltas: number[] = [];
				let last = performance.now();
				const tick = (time: number) => {
					deltas.push(time - last);
					last = time;
					if (deltas.length < 120) requestAnimationFrame(tick);
					else resolve(deltas.sort((a, b) => a - b));
				};
				requestAnimationFrame(tick);
			}),
	);
	expect(frames[60]).toBeLessThan(34);
});

test("dragging a tower over the full six-chapter map does not freeze", async ({
	page,
}) => {
	await lateChapter(page, false);
	const tile = await page
		.getByRole("button", { name: /^Стрелковая · / })
		.boundingBox();
	const started = Date.now();
	await page.mouse.move(tile!.x + 20, tile!.y + 20);
	await page.mouse.down();
	for (let step = 0; step < 80; step++)
		await page.mouse.move(60 + (step % 40) * 7, 700 - step * 6);
	await page.mouse.up();
	expect(Date.now() - started).toBeLessThan(6000);
});
