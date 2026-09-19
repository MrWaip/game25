import { test, expect } from "./fixtures";

test("the flyer sprite reads in flight above the road and ignores oil and stone", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1200, height: 700 });
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const result = await page.evaluate(async () => {
		const { createDefenseSession } =
			await import("/src/games/defense/session.ts");
		const { loadAssets } = await import("/src/games/defense/assets.ts");
		const { DefenseRenderer } = await import("/src/games/defense/renderer.ts");
		const assets = await loadAssets();
		const initial = await createDefenseSession({ seed: "flyer-art" });
		initial.startWave();
		initial.build(0, "oil");
		initial.build(1, "arrow");
		const state = initial.snapshot();
		await initial.destroy();
		for (const tower of state.towers) {
			tower.construction = 0;
			tower.constructionKind = null;
		}
		state.wave = 4;
		state.remaining = 0;
		state.nextId = 4;
		const unit = {
			hp: 120,
			maxHp: 120,
			oil: 0,
			layers: 0,
			slow: 0,
			burn: 0,
			burnStacks: 0,
			spreadIn: 0,
		};
		state.enemies = [
			{ ...unit, id: 1, kind: "flyer", distance: 245 },
			{ ...unit, id: 2, kind: "goblin", distance: 235 },
			{ ...unit, id: 3, kind: "flyer", distance: 120 },
		];
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-6", run: state }),
		});
		const preview = document.createElement("div");
		preview.id = "flyer-preview";
		preview.style.cssText = "display:flex;width:1170px;height:580px";
		document.body.replaceChildren(preview);
		for (const frames of [1, 40, 60]) {
			session.step(frames);
			const canvas = document.createElement("canvas");
			canvas.style.cssText = "width:390px;height:580px;flex:none";
			preview.append(canvas);
			new DefenseRenderer(canvas, assets).draw(session.snapshot(), null);
		}
		const snapshot = session.snapshot();
		const probe = document.createElement("canvas");
		probe.width = assets.flyer.naturalWidth;
		probe.height = assets.flyer.naturalHeight;
		const context = probe.getContext("2d")!;
		context.drawImage(assets.flyer, 0, 0);
		await session.destroy();
		return {
			flyerOil: snapshot.enemies
				.filter((enemy: { kind: string }) => enemy.kind === "flyer")
				.map((enemy: { oil: number }) => enemy.oil),
			cornerAlpha: context.getImageData(0, 0, 1, 1).data[3],
		};
	});
	expect(result.flyerOil).toEqual([0, 0]);
	expect(result.cornerAlpha).toBe(0);
	await page
		.locator("#flyer-preview")
		.screenshot({ path: "test-results/flyer-animation.png", scale: "css" });
});
