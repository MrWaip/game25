import { test, expect } from "./fixtures";

test("stone tower fits the narrow mobile tray and can be built and restored", async ({
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 844 });
	await page.goto("/?game=defense&seed=siege-ui");
	const stone = page.getByRole("button", {
		name: "Камнемёт · 100",
		exact: true,
	});
	await expect(stone).toBeDisabled();
	const play = page.getByRole("button", { name: "Плей", exact: true });
	const bounds = await play.boundingBox();
	expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
	await play.click();
	const from = await stone.boundingBox();
	const to = await page
		.getByRole("button", { name: "Площадка 1", exact: true })
		.boundingBox();
	await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
	await page.mouse.down();
	await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, {
		steps: 8,
	});
	await page.mouse.up();
	await expect(
		page.getByRole("button", { name: "Камнемёт · уровень 1 · площадка 1" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Пауза боя", exact: true }).click();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/siege-mobile.png", scale: "css" });
	await page.reload();
	await expect(
		page.getByRole("button", { name: "Камнемёт · уровень 1 · площадка 1" }),
	).toBeVisible();
});

test("generated siege sprites render flight, damaged shields and the breakup", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1200, height: 700 });
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const result = await page.evaluate(async () => {
		const sessionPath = "/src/games/defense/session.ts";
		const assetsPath = "/src/games/defense/assets.ts";
		const rendererPath = "/src/games/defense/renderer.ts";
		const { createDefenseSession } = await import(sessionPath);
		const { loadAssets } = await import(assetsPath);
		const { DefenseRenderer } = await import(rendererPath);
		const assets = await loadAssets();
		const initial = await createDefenseSession({ seed: "siege-art" });
		initial.startWave();
		initial.build(0, "stone");
		const state = initial.snapshot();
		await initial.destroy();
		// The catapult is already standing; this scene is about its shots.
		state.towers[0].construction = 0;
		state.towers[0].constructionKind = null;
		state.wave = 3;
		state.remaining = 0;
		state.nextId = 2;
		state.enemies = [
			{
				id: 1,
				kind: "shieldSquad",
				hp: 144,
				maxHp: 144,
				memberHp: 45,
				distance: 200,
				oil: 0,
				layers: 0,
				slow: 0,
				burn: 0,
				burnStacks: 0,
				spreadIn: 0,
			},
		];
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-3", run: state }),
		});
		const preview = document.createElement("div");
		preview.id = "siege-preview";
		preview.style.cssText = "display:flex;width:1170px;height:580px";
		document.body.replaceChildren(preview);
		const health = [];
		for (const frames of [20, 25, 217]) {
			session.step(frames);
			const snapshot = session.snapshot();
			health.push(snapshot.enemies.map((enemy: { hp: number }) => enemy.hp));
			const canvas = document.createElement("canvas");
			canvas.style.cssText = "width:390px;height:580px;flex:none";
			preview.append(canvas);
			new DefenseRenderer(canvas, assets).draw(snapshot, null);
		}
		const probe = document.createElement("canvas");
		probe.width = assets.siege.naturalWidth;
		probe.height = assets.siege.naturalHeight;
		const context = probe.getContext("2d")!;
		context.drawImage(assets.siege, 0, 0);
		const cornerAlpha = context.getImageData(0, 0, 1, 1).data[3];
		await session.destroy();
		return { health, cornerAlpha };
	});
	expect(result.health).toEqual([[144], [72], [45, 45, 45, 45, 45]]);
	expect(result.cornerAlpha).toBe(0);
	await page
		.locator("#siege-preview")
		.screenshot({ path: "test-results/siege-animation.png", scale: "css" });
});
