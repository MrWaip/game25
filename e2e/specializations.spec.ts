import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";

async function dragTowerTo(page: Page, from: string, to: string) {
	const a = await page
		.getByRole("button", { name: from, exact: true })
		.boundingBox();
	const b = await page
		.getByRole("button", { name: to, exact: true })
		.boundingBox();
	if (!a || !b) throw new Error("Missing drag endpoint");
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
	await page.mouse.down();
	await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
	await page.mouse.up();
}

test("the oil tower offers its three branches and the bought one survives a reload", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=branches");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	await dragTowerTo(page, "Масляная · 70", "Площадка 1");
	await page.getByRole("button", { name: "Улучшить · 40" }).click();
	await page.getByRole("button", { name: "Специализация · 70" }).click();
	for (const branch of [/Густое масло/, /Кислота/, /Пропитка/])
		await expect(page.getByRole("button", { name: branch })).toBeVisible();
	await page.getByRole("button", { name: /Кислота/ }).click();
	await expect(
		page.getByRole("button", { name: "Масляная · уровень 3 · площадка 1" }),
	).toBeVisible();

	await page.reload();
	await expect(
		page.getByRole("button", { name: "Масляная · уровень 3 · площадка 1" }),
	).toBeVisible();
});

test("acid eats a shield and a stunning stone freezes the road", async ({
	page,
}) => {
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
		const initial = await createDefenseSession({ seed: "specialization-art" });
		initial.startWave();
		initial.build(0, "oil");
		initial.build(1, "stone");
		const state = initial.snapshot();
		await initial.destroy();
		for (const tower of state.towers) {
			tower.level = 3;
			tower.construction = 0;
			tower.constructionKind = null;
		}
		state.towers[0].specialization = "acid";
		state.towers[1].specialization = "stun";
		state.remaining = 0;
		state.nextId = 3;
		const unit = {
			oil: 0,
			layers: 0,
			slow: 0,
			acid: 0,
			vulnerability: 1,
			stun: 0,
			burn: 0,
			burnStacks: 0,
			spreadIn: 0,
		};
		state.enemies = [
			{
				...unit,
				id: 1,
				kind: "shieldSquad",
				hp: 144,
				maxHp: 144,
				memberHp: 45,
				distance: 60,
			},
			{ ...unit, id: 2, kind: "goblin", hp: 3000, maxHp: 3000, distance: 40 },
		];
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-7", run: state }),
		});
		const preview = document.createElement("div");
		preview.id = "specialization-preview";
		preview.style.cssText = "display:flex;width:780px;height:580px";
		document.body.replaceChildren(preview);
		let stunned = false;
		for (const frames of [240, 1560]) {
			for (let i = 0; i < frames; i += 5) {
				session.step(5);
				if (
					session
						.snapshot()
						.enemies.some((enemy: { stun: number }) => enemy.stun > 0)
				)
					stunned = true;
			}
			const canvas = document.createElement("canvas");
			canvas.style.cssText = "width:390px;height:580px;flex:none";
			preview.append(canvas);
			new DefenseRenderer(canvas, assets).draw(session.snapshot(), null);
		}
		const shield = session
			.snapshot()
			.enemies.find((enemy: { kind: string }) => enemy.kind === "shieldSquad");
		await session.destroy();
		return { stunned, shieldHp: shield ? shield.hp : 0 };
	});
	expect(result.stunned).toBe(true);
	expect(result.shieldHp).toBeLessThan(144);
	await page
		.locator("#specialization-preview")
		.screenshot({ path: "test-results/specializations.png", scale: "css" });
});

test("a ricochet volley is drawn as arrows hopping between neighbours", async ({
	page,
}) => {
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
		const initial = await createDefenseSession({ seed: "ricochet-art" });
		initial.startWave();
		initial.build(0, "arrow");
		const state = initial.snapshot();
		await initial.destroy();
		state.towers[0].level = 3;
		state.towers[0].specialization = "ricochet";
		state.towers[0].construction = 0;
		state.towers[0].constructionKind = null;
		state.remaining = 0;
		state.nextId = 4;
		const unit = {
			kind: "goblin",
			hp: 900,
			maxHp: 900,
			oil: 0,
			layers: 0,
			slow: 0,
			acid: 0,
			vulnerability: 1,
			stun: 0,
			burn: 0,
			burnStacks: 0,
			spreadIn: 0,
		};
		state.enemies = [
			{ ...unit, id: 1, distance: 250 },
			{ ...unit, id: 2, distance: 230 },
			{ ...unit, id: 3, distance: 210 },
		];
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-7", run: state }),
		});
		const preview = document.createElement("div");
		preview.id = "ricochet-preview";
		preview.style.cssText = "display:flex;width:1170px;height:580px";
		document.body.replaceChildren(preview);
		let bouncesInFlight = 0;
		const frames: number[] = [];
		for (let i = 0; i < 60; i++) {
			session.step();
			const shots = session.snapshot().shots;
			const bounces = shots.filter(
				(shot: { impact?: { targetId: number } }) =>
					shot.impact && shot.impact.targetId !== 1,
			).length;
			if (bounces > bouncesInFlight) {
				bouncesInFlight = bounces;
				frames.push(i);
			}
			if (frames.length && frames.length < 4 && frames.at(-1) === i) {
				const canvas = document.createElement("canvas");
				canvas.style.cssText = "width:390px;height:580px;flex:none";
				preview.append(canvas);
				new DefenseRenderer(canvas, assets).draw(session.snapshot(), null);
			}
		}
		await session.destroy();
		return { bouncesInFlight, frames };
	});
	expect(result.bouncesInFlight).toBeGreaterThan(0);
	await page
		.locator("#ricochet-preview")
		.screenshot({ path: "test-results/ricochet.png", scale: "css" });
});

test("the tray is dead between waves and every drop inside a wave builds at once", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=build-lock");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	await dragTowerTo(page, "Стрелковая · 60", "Площадка 1");
	await expect(
		page.getByRole("button", { name: "Стрелковая · уровень 1 · площадка 1" }),
	).toBeVisible();
	await dragTowerTo(page, "Масляная · 70", "Площадка 2");
	await expect(
		page.getByRole("button", { name: "Масляная · уровень 1 · площадка 2" }),
	).toBeVisible();

	const saved = await page.evaluate(async () => {
		const { createDefenseSession } =
			await import("/src/games/defense/session.ts");
		const initial = await createDefenseSession({ seed: "build-lock-pause" });
		initial.startWave();
		const state = initial.snapshot();
		await initial.destroy();
		state.phase = "prepare";
		state.remaining = 0;
		state.enemies = [];
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-7", run: state }),
		});
		const saved = session.save();
		await session.destroy();
		return saved;
	});
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
	await expect(
		page.getByRole("button", { name: "Стрелковая · 60" }),
	).toBeDisabled();
	await dragTowerTo(page, "Стрелковая · 60", "Площадка 1");
	await expect(
		page.getByRole("button", { name: "Стрелковая · уровень 1 · площадка 1" }),
	).toBeHidden();
	await page.getByRole("button", { name: "Следующая волна" }).click();
	await dragTowerTo(page, "Стрелковая · 60", "Площадка 1");
	await expect(
		page.getByRole("button", { name: "Стрелковая · уровень 1 · площадка 1" }),
	).toBeVisible();
});
