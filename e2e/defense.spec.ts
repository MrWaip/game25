import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
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

test("mobile player starts, builds and improves a tower on the field", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=mobile");
	await expect(
		page.getByRole("button", { name: "Стрелковая · 60" }),
	).toBeDisabled();
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	await dragTowerTo(page, "Стрелковая · 60", "Площадка 1");
	await expect(
		page.getByRole("button", { name: "Стрелковая · уровень 1 · площадка 1" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Улучшить · 40" }).click();
	await page.getByRole("button", { name: "Специализация · 70" }).click();
	for (const branch of [/Тяжёлые наконечники/, /Огненные стрелы/, /Рикошет/])
		await expect(page.getByRole("button", { name: branch })).toBeVisible();
	await page.getByRole("button", { name: /Огненные стрелы/ }).click();
	await expect(
		page.getByRole("button", { name: "Стрелковая · уровень 3 · площадка 1" }),
	).toBeVisible();
	await page.locator(".td-field").click({ position: { x: 12, y: 100 } });
	await page.getByRole("button", { name: "Пауза боя", exact: true }).click();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/defense-field.png" });
	await page.reload();
	await expect(
		page.getByRole("button", { name: "Стрелковая · уровень 3 · площадка 1" }),
	).toBeVisible();
});

test("Canvas reward cards survive reload, select once and keep placeholders disabled", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const saved = await page.evaluate(async () => {
		const entry = "/src/games/defense/session.ts";
		const { createDefenseSession } = await import(entry);
		const session = await createDefenseSession({ seed: "reward-screen" });
		session.startWave();
		session.build(0, "arrow");
		session.build(1, "arrow");
		session.step(3600);
		const saved = session.save();
		await session.destroy();
		return saved;
	});
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
	// The pool is large and seeded, so the offer is read off the panel itself.
	const offers = page
		.getByRole("dialog")
		.getByRole("button")
		.filter({ hasNot: page.getByText("Пропустить") })
		.and(page.locator("[aria-description]"));
	await expect(offers.first()).toBeVisible();
	const offered = await offers.first().getAttribute("aria-label");
	await expect(offers).toHaveCount(3);
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/defense-rewards.png" });
	await page.reload();
	await page.getByRole("button", { name: offered!, exact: true }).click();
	await expect(page.getByRole("dialog")).toBeHidden();
	await expect(
		page.getByRole("button", { name: "Следующая волна", exact: true }),
	).toBeEnabled();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/defense-next-wave.png" });
});

test("expanded field scrolls freely and the offscreen threat button reaches the gate", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const saved = await page.evaluate(async () => {
		const entry = "/src/games/defense/session.ts",
			boardEntry = "/src/games/defense/board.ts";
		const { createDefenseSession } = await import(entry);
		const { pathLengthFor } = await import(boardEntry);
		const session = await createDefenseSession({ seed: "expanded" });
		session.startWave();
		session.step();
		const state = session.snapshot();
		await session.destroy();
		state.level = 6;
		state.wave = 16;
		state.remaining = 0;
		state.enemies[0].distance = pathLengthFor(6) - 90;
		return JSON.stringify({ version: "gdd-1", run: state });
	});
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
	await page.getByRole("button", { name: "Пауза боя", exact: true }).click();
	await page.getByRole("button", { name: "⚠ К воротам", exact: true }).click();
	expect(
		await page.locator(".td-scroll").evaluate((node) => node.scrollTop),
	).toBeGreaterThan(500);
	await expect(
		page.getByRole("button", { name: "⚠ К воротам", exact: true }),
	).toBeHidden();
});

test("the shared launcher can switch from defense to the existing platformer and back", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await page.getByRole("button", { name: "Платформер", exact: true }).click();
	await expect(page.locator(".jumper-stage canvas").first()).toBeVisible();
	await page.getByRole("button", { name: "Оборона", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
});

test("the initial map fits between Canvas HUD and tray, and towers can be dragged onto sites", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=drag");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	const field = await page.locator(".td-field").boundingBox();
	const tray = await page.locator(".td-tray").boundingBox();
	if (!field || !tray) throw new Error("Missing game layout");
	expect(field.y + field.height).toBeLessThanOrEqual(tray.y);
	const source = await page
		.getByRole("button", { name: "Стрелковая · 60", exact: true })
		.boundingBox();
	const target = await page
		.getByRole("button", { name: "Площадка 1", exact: true })
		.boundingBox();
	if (!source || !target) throw new Error("Missing drag controls");
	await page.mouse.move(
		source.x + source.width / 2,
		source.y + source.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(
		target.x + target.width / 2,
		target.y + target.height / 2,
		{ steps: 10 },
	);
	await expect(page.locator(".td-drag-preview")).toBeVisible();
	await page.mouse.up();
	await expect(
		page.getByRole("button", { name: "Стрелковая · уровень 1 · площадка 1" }),
	).toBeVisible();
	await expect(page.locator(".td-drag-preview")).toBeHidden();
	const selectedField = await page.locator(".td-field").boundingBox();
	const detail = await page.locator(".td-detail").boundingBox();
	if (!selectedField || !detail) throw new Error("Missing selected layout");
	expect(detail.y).toBeGreaterThanOrEqual(selectedField.y);
	expect(detail.y + detail.height).toBeLessThan(
		selectedField.y + selectedField.height,
	);
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/defense-drag-layout.png" });
});

test("tower menus preserve map size and dragging existing towers moves or swaps them", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=swap");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	const original = await page.locator(".td-field").boundingBox();
	await page.getByRole("button", { name: "Площадка 1", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Построить · 60", exact: true }),
	).toHaveCount(0);
	expect(await page.locator(".td-field").boundingBox()).toEqual(original);
	await dragTowerTo(page, "Стрелковая · 60", "Площадка 1");
	await page.locator(".td-field").click({ position: { x: 12, y: 100 } });
	await dragTowerTo(page, "Масляная · 70", "Площадка 2");
	async function drag(from: string, to: string) {
		const a = await page
				.getByRole("button", { name: from, exact: true })
				.boundingBox(),
			b = await page
				.getByRole("button", { name: to, exact: true })
				.boundingBox();
		if (!a || !b) throw new Error("Missing tower");
		await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
		await page.mouse.down();
		await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
		await page.mouse.up();
	}
	await drag("Стрелковая · уровень 1 · площадка 1", "Площадка 3");
	await expect(
		page.getByRole("button", {
			name: "Стрелковая · уровень 1 · площадка 3",
			exact: true,
		}),
	).toBeVisible();
	await drag(
		"Стрелковая · уровень 1 · площадка 3",
		"Масляная · уровень 1 · площадка 2",
	);
	await expect(
		page.getByRole("button", {
			name: "Стрелковая · уровень 1 · площадка 2",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Масляная · уровень 1 · площадка 3",
			exact: true,
		}),
	).toBeVisible();
	expect(await page.locator(".td-field").boundingBox()).toEqual(original);
	await expect(
		page.getByRole("button", { name: "Переставить", exact: true }),
	).toHaveCount(0);
});

test("interrupted tower dragging clears the preview without moving or buying", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=cancel");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	const source = page.getByRole("button", {
		name: "Стрелковая · 60",
		exact: true,
	});
	await expect(source).toHaveCSS("touch-action", "none");
	const start = await source.boundingBox();
	const target = await page
		.getByRole("button", { name: "Площадка 1", exact: true })
		.boundingBox();
	if (!start || !target) throw new Error("Missing drag targets");
	await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		target.x + target.width / 2,
		target.y + target.height / 2,
		{ steps: 6 },
	);
	await expect(page.locator(".td-drag-preview")).toBeVisible();
	await page.locator(".td-tray").dispatchEvent("pointercancel");
	await page.mouse.up();
	await expect(page.locator(".td-drag-preview")).toBeHidden();
	await expect(
		page.getByRole("button", { name: "Площадка 1", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Стрелковая · уровень 1 · площадка 1",
			exact: true,
		}),
	).toHaveCount(0);
});

test("touch dragging builds from the tray without scrolling the field", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=touch");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	const source = await page
		.getByRole("button", { name: "Стрелковая · 60", exact: true })
		.boundingBox();
	const target = await page
		.getByRole("button", { name: "Площадка 1", exact: true })
		.boundingBox();
	if (!source || !target) throw new Error("Missing touch targets");
	const client = await page.context().newCDPSession(page);
	const x = source.x + source.width / 2,
		y = source.y + source.height / 2;
	await client.send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [{ x, y }],
	});
	for (let step = 1; step <= 8; step++) {
		await client.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: [
				{
					x: x + ((target.x + target.width / 2 - x) * step) / 8,
					y: y + ((target.y + target.height / 2 - y) * step) / 8,
				},
			],
		});
	}
	await expect(page.locator(".td-drag-preview")).toBeVisible();
	await client.send("Input.dispatchTouchEvent", {
		type: "touchEnd",
		touchPoints: [],
	});
	await expect(
		page.getByRole("button", {
			name: "Стрелковая · уровень 1 · площадка 1",
			exact: true,
		}),
	).toBeVisible();
	await expect(page.locator(".td-drag-preview")).toBeHidden();
	expect(
		await page.locator(".td-scroll").evaluate((element) => element.scrollTop),
	).toBe(0);
	await client.detach();
});

test("field uses the available width and tower controls float beside the selected site", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=layout");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	const field = await page.locator(".td-field").boundingBox();
	const viewport = await page.locator(".td-scroll").boundingBox();
	const tray = await page.locator(".td-tray").boundingBox();
	if (!field || !viewport || !tray) throw new Error("Missing layout");
	expect(field.width).toBeCloseTo(viewport.width, 0);
	expect(tray.y - viewport.y - viewport.height).toBeLessThanOrEqual(6);
	await dragTowerTo(page, "Стрелковая · 60", "Площадка 1");
	expect(await page.locator(".td-field").boundingBox()).toEqual(field);
	const detail = await page.locator(".td-detail").boundingBox();
	if (!detail) throw new Error("Missing tower controls");
	expect(detail.y + detail.height).toBeLessThan(tray.y);
	expect(detail.width).toBeLessThanOrEqual(180);
	await expect(
		page.getByRole("button", { name: "Закрыть", exact: true }),
	).toHaveCount(0);

	await expect(
		page.getByRole("button", { name: "Улучшить · 40", exact: true }),
	).toBeVisible();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/defense-tower-popup.png", scale: "css" });
	await page.locator(".td-field").click({ position: { x: 12, y: 100 } });
	await expect(page.locator(".td-detail")).toBeHidden();
	await page
		.getByRole("button", {
			name: "Стрелковая · уровень 1 · площадка 1",
			exact: true,
		})
		.click();

	await expect(
		page.getByRole("button", { name: "Стрелковая · 60", exact: true }),
	).toBeVisible();
	await page.locator(".td-field").click({ position: { x: 12, y: 100 } });
	await expect(
		page.getByRole("button", { name: "Стрелковая · 60", exact: true }),
	).toBeVisible();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/defense-full-width.png" });
});

test("the road entrance stays clear of HUD and panels before Play", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=entrance");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const entranceCovered = await page.locator(".defense").evaluate((root) => {
		const field = root.querySelector(".td-field");
		if (!field) throw new Error("Missing field");
		const rect = field.getBoundingClientRect();
		const x = rect.x + rect.width / 2,
			y = rect.y + 10;
		return [...root.querySelectorAll("canvas")].some((canvas) => {
			if (field.contains(canvas)) return false;
			const box = canvas.getBoundingClientRect();
			return (
				box.width > 0 &&
				box.height > 0 &&
				x >= box.left &&
				x < box.right &&
				y >= box.top &&
				y < box.bottom
			);
		});
	});
	expect(entranceCovered).toBe(false);
	await page.screenshot({ path: "test-results/defense-start-screen.png" });
});

test("a newly spawned goblin has its health bar fully visible below the HUD", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=spawn");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	await page.getByRole("button", { name: "Пауза боя", exact: true }).click();
	const visibleHealthBar = await page
		.locator(".td-field > canvas")
		.evaluate((canvas: HTMLCanvasElement) => {
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Missing canvas");
			const scale = canvas.width / 390;
			const pixels = ctx.getImageData(
				Math.floor(182 * scale),
				0,
				Math.ceil(26 * scale),
				Math.ceil(100 * scale),
			);
			for (let y = 0; y < pixels.height; y++) {
				let red = 0;
				for (let x = 0; x < pixels.width; x++) {
					const offset = (y * pixels.width + x) * 4;
					if (
						pixels.data[offset] === 238 &&
						pixels.data[offset + 1] === 101 &&
						pixels.data[offset + 2] === 89
					)
						red++;
				}
				if (red >= 20 * scale) return true;
			}
			return false;
		});
	expect(visibleHealthBar).toBe(true);
	await page.screenshot({ path: "test-results/defense-spawn.png" });
});

test("the field renders at the displayed size and native screen pixel density", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=sharp");
	const field = page.locator(".td-field > canvas");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	await expect
		.poll(() =>
			field.evaluate((canvas: HTMLCanvasElement) => {
				const rect = canvas.getBoundingClientRect();
				return Math.abs(
					canvas.width - Math.round(rect.width * devicePixelRatio),
				);
			}),
		)
		.toBeLessThanOrEqual(1);
	await page.setViewportSize({ width: 460, height: 920 });
	await expect
		.poll(() =>
			field.evaluate((canvas: HTMLCanvasElement) => {
				const rect = canvas.getBoundingClientRect();
				return Math.abs(
					canvas.width - Math.round(rect.width * devicePixelRatio),
				);
			}),
		)
		.toBeLessThanOrEqual(1);
});

test("an oiled goblin stands on the road center instead of its lower edge", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const saved = await page.evaluate(async () => {
		const entry = "/src/games/defense/session.ts";
		const { createDefenseSession } = await import(entry);
		const session = await createDefenseSession({ seed: "foot-anchor" });
		session.startWave();
		session.step();
		const state = session.snapshot();
		await session.destroy();
		state.remaining = 0;
		state.enemies[0].distance = 60;
		state.enemies[0].oil = 10;
		return JSON.stringify({ version: "gdd-1", run: state });
	});
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
	await page.getByRole("button", { name: "Пауза боя", exact: true }).click();
	const center = await page
		.locator(".td-field > canvas")
		.evaluate((canvas: HTMLCanvasElement) => {
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Missing canvas");
			const scale = canvas.width / 390;
			const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
			let top = Infinity,
				bottom = -Infinity;
			for (let y = Math.floor(65 * scale); y < 110 * scale; y++) {
				for (let x = Math.floor(220 * scale); x < 280 * scale; x++) {
					const i = (y * pixels.width + x) * 4;
					if (
						pixels.data[i] === 57 &&
						pixels.data[i + 1] === 48 &&
						pixels.data[i + 2] === 38
					) {
						top = Math.min(top, y);
						bottom = Math.max(bottom, y);
					}
				}
			}
			return (top + bottom) / (2 * scale);
		});
	expect(Math.abs(center - 85)).toBeLessThan(2);
	await page.screenshot({ path: "test-results/defense-road-center.png" });
});

test("button glyphs are vertically centered inside their hit areas", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=button-center");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	await page.getByRole("button", { name: "Площадка 1", exact: true }).click();
	const pause = await page
		.getByRole("button", { name: "Пауза боя", exact: true })
		.boundingBox();
	if (!pause) throw new Error("Missing pause button");
	const offset = await page
		.locator(".td-hud canvas")
		.evaluate((canvas: HTMLCanvasElement, button) => {
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Missing canvas");
			const rect = canvas.getBoundingClientRect(),
				scale = canvas.width / rect.width;
			const left = Math.round((button.x - rect.x) * scale),
				top = Math.round((button.y - rect.y) * scale);
			const pixels = ctx.getImageData(
				left,
				top,
				Math.round(button.width * scale),
				Math.round(button.height * scale),
			);
			let min = Infinity,
				max = -Infinity;
			for (let y = 0; y < pixels.height; y++)
				for (let x = 0; x < pixels.width; x++) {
					const i = (y * pixels.width + x) * 4;
					if (
						pixels.data[i] > 220 &&
						pixels.data[i + 1] > 220 &&
						pixels.data[i + 2] > 200
					) {
						min = Math.min(min, y);
						max = Math.max(max, y);
					}
				}
			return Math.abs((min + max) / (2 * scale) - button.height / 2);
		}, pause);
	expect(offset).toBeLessThan(1);
});

test("map extensions have distinct scenery and preserve the old region", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=biomes");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const samples = await page.evaluate(async () => {
		Object.defineProperty(window, "devicePixelRatio", { value: 1 });
		const sessionEntry = "/src/games/defense/session.ts";
		const rendererEntry = "/src/games/defense/renderer.ts";
		const assetsEntry = "/src/games/defense/assets.ts";
		const boardEntry = "/src/games/defense/board.ts";
		const { extensionHeight } = await import(boardEntry);
		const { createDefenseSession } = await import(sessionEntry);
		const { DefenseRenderer } = await import(rendererEntry);
		const { loadAssets } = await import(assetsEntry);
		const session = await createDefenseSession({ seed: "biomes" });
		const canvas = document.createElement("canvas");
		canvas.style.width = "390px";
		canvas.style.height = "580px";
		document.body.append(canvas);
		const renderer = new DefenseRenderer(canvas, await loadAssets());
		const state = session.snapshot();
		const crop = (top: number) => {
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Canvas context unavailable");
			const scale = canvas.width / 390;
			return Array.from(
				context.getImageData(
					0,
					Math.round(top * scale),
					Math.floor(390 * scale),
					Math.floor(380 * scale),
				).data,
			);
		};
		renderer.draw(state, null);
		const original = crop(150);
		state.level = 6;
		canvas.style.height = `${580 + 5 * extensionHeight}px`;
		renderer.draw(state, null);
		const expanded = crop(150 + 5 * extensionHeight);
		const colors = Array.from({ length: 6 }, (_, index) => {
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Canvas context unavailable");
			const scale = canvas.width / 390;
			return Array.from(
				context.getImageData(
					2 * scale,
					(2 + (5 - index) * extensionHeight) * scale,
					1,
					1,
				).data,
			).join(",");
		});
		canvas.id = "scenery-preview";
		await session.destroy();
		// Rasterising the same region 5800px up the canvas rounds a handful of
		// road-edge pixels differently; the scenery itself must not move.
		const drifted = original.reduce(
			(count, value, index) =>
				Math.abs(value - expanded[index]) > 2 ? count + 1 : count,
			0,
		);
		return {
			stable: drifted <= 40,
			maxDifference: original.reduce(
				(max, value, index) => Math.max(max, Math.abs(value - expanded[index])),
				0,
			),
			drifted,
			colors,
		};
	});
	await page
		.locator("#scenery-preview")
		.screenshot({ path: "test-results/defense-biomes.png" });
	expect(
		samples.stable,
		`${samples.drifted} channels drifted, max ${samples.maxDifference}`,
	).toBe(true);
	expect(new Set(samples.colors).size).toBe(6);
});

test("compact mobile HUD and tower tiles keep their proportions", async ({
	page,
}) => {
	for (const width of [320, 390]) {
		await page.setViewportSize({ width, height: 844 });
		await page.goto("/?game=defense&seed=compact-ui");
		await expect(
			page.getByRole("button", { name: "Плей", exact: true }),
		).toBeVisible();
		const hud = await page.locator(".td-hud").boundingBox();
		const tower = await page
			.getByRole("button", { name: "Стрелковая · 60" })
			.boundingBox();
		if (!hud || !tower) throw new Error("HUD missing");
		expect(hud.height).toBeLessThanOrEqual(86);
		expect(tower.width).toBeLessThanOrEqual(66);
		expect(tower.height).toBe(64);
		const oil = await page
			.getByRole("button", { name: "Масляная · 70" })
			.boundingBox();
		const play = await page
			.getByRole("button", { name: "Плей", exact: true })
			.boundingBox();
		if (!oil || !play) throw new Error("Tray buttons missing");
		expect(oil.y).toBe(tower.y);
		expect(play.y).toBe(tower.y);
		expect(play.height).toBe(tower.height);
		await page
			.locator(".defense")
			.screenshot({ path: `test-results/defense-compact-${width}.png` });
	}
});

test("oil projectiles leave a splash after flight and the effect fades", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const result = await page.evaluate(async () => {
		const sessionEntry = "/src/games/defense/session.ts",
			rendererEntry = "/src/games/defense/renderer.ts",
			assetsEntry = "/src/games/defense/assets.ts";
		const { createDefenseSession } = await import(sessionEntry);
		const { DefenseRenderer } = await import(rendererEntry);
		const { loadAssets } = await import(assetsEntry);
		const session = await createDefenseSession({ seed: "effects" });
		session.startWave();
		session.step();
		const state = session.snapshot();
		const canvas = document.createElement("canvas");
		canvas.id = "effects-preview";
		canvas.style.width = "390px";
		canvas.style.height = "580px";
		document.body.append(canvas);
		const renderer = new DefenseRenderer(canvas, await loadAssets());
		const enemy = state.enemies[0];
		enemy.distance = 320;
		enemy.oil = 4;
		enemy.burn = 3;
		enemy.burnStacks = 3;
		state.shots = [
			{
				from: { x: 245, y: 140 },
				to: { x: 305, y: 140 },
				sprite: "oilDrop",
				fire: false,
				age: 0.38,
			},
		];
		const oilPixels = () => {
			const context = canvas.getContext("2d");
			if (!context) throw new Error("No canvas context");
			const scale = canvas.width / 390;
			const pixels = context.getImageData(
				278 * scale,
				108 * scale,
				54 * scale,
				67 * scale,
			).data;
			let dark = 0;
			for (let i = 0; i < pixels.length; i += 4)
				if (pixels[i] < 120 && pixels[i + 1] < 115 && pixels[i + 2] < 80)
					dark++;
			return dark;
		};
		renderer.draw(state, null);
		const splash = oilPixels();
		state.shots[0].age = 0.89;
		renderer.draw(state, null);
		const faded = oilPixels();
		state.shots[0].age = 0.38;
		state.shots.push({
			from: { x: 145, y: 240 },
			to: { x: 195, y: 190 },
			sprite: "arrow",
			fire: true,
			age: 0.08,
		});
		renderer.draw(state, null);
		await session.destroy();
		const context = canvas.getContext("2d");
		if (!context) throw new Error("No canvas context");
		const scale = canvas.width / 390;
		const face = () =>
			Array.from(
				context.getImageData(208 * scale, 178 * scale, 2 * scale, 3 * scale)
					.data,
			);
		const burningFace = face();
		enemy.burn = 0;
		renderer.draw(state, null);
		const clearFace = face();
		enemy.burn = 3;
		renderer.draw(state, null);
		return {
			splash,
			faded,
			faceVisible: burningFace.every(
				(pixel, index) => pixel === clearFace[index],
			),
		};
	});
	expect(result.splash).toBeGreaterThan(result.faded + 20);
	expect(result.faceVisible).toBe(true);
	await page
		.locator("#effects-preview")
		.screenshot({ path: "test-results/defense-effects.png", scale: "css" });
});

test("overlapping oiled enemies render by depth rather than spawn order", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const identical = await page.evaluate(async () => {
		const sessionEntry = "/src/games/defense/session.ts",
			rendererEntry = "/src/games/defense/renderer.ts",
			assetsEntry = "/src/games/defense/assets.ts";
		const { createDefenseSession } = await import(sessionEntry);
		const { DefenseRenderer } = await import(rendererEntry);
		const { loadAssets } = await import(assetsEntry);
		const session = await createDefenseSession({ seed: "crowd-layers" });
		session.startWave();
		session.step();
		const state = session.snapshot(),
			enemy = state.enemies[0];
		state.enemies = Array.from({ length: 5 }, (_, i) => ({
			...enemy,
			id: i + 1,
			distance: 158 + i * 9,
			oil: 5,
			burn: 3,
			burnStacks: 3,
		}));
		state.shots = [
			{
				from: { x: 245, y: 140 },
				to: { x: 305, y: 152 },
				sprite: "oilDrop",
				fire: false,
				age: 0.38,
			},
		];
		const canvas = document.createElement("canvas");
		canvas.id = "crowd-preview";
		canvas.style.width = "390px";
		canvas.style.height = "580px";
		document.body.append(canvas);
		const renderer = new DefenseRenderer(canvas, await loadAssets());
		renderer.draw(state, null);
		const first = canvas.toDataURL();
		state.enemies.reverse();
		renderer.draw(state, null);
		const same = first === canvas.toDataURL();
		await session.destroy();
		return same;
	});
	await page.locator("#crowd-preview").screenshot({
		path: "test-results/defense-crowd-layers.png",
		scale: "css",
	});
	expect(identical).toBe(true);
});

test("a new region fills at least one mobile playfield", async ({ page }) => {
	for (const width of [320, 390]) {
		await page.setViewportSize({ width, height: 932 });
		await page.goto("/?game=defense");
		await expect(
			page.getByRole("button", { name: "Плей", exact: true }),
		).toBeVisible();
		const coversScreen = await page
			.locator(".td-scroll")
			.evaluate(async (viewport) => {
				const entry = "/src/games/defense/board.ts";
				const { extensionHeight, boardWidth } = await import(entry);
				return (
					(extensionHeight * viewport.clientWidth) / boardWidth >=
					viewport.clientHeight
				);
			});
		expect(coversScreen).toBe(true);
	}
});

test("desert expansion provides twelve clustered sites across a full screen region", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const saved = await page.evaluate(async () => {
		const entry = "/src/games/defense/session.ts";
		const { createDefenseSession } = await import(entry);
		const session = await createDefenseSession({ seed: "desert-atlas" });
		session.startWave();
		const state = session.snapshot();
		state.level = 5;
		state.wave = 13;
		state.spawnIn = 100;
		await session.destroy();
		return JSON.stringify({ version: "gdd-2", run: state });
	});
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
	await dragTowerTo(page, "Стрелковая · 60", "Площадка 47");

	await expect(
		page.getByRole("button", {
			name: "Стрелковая · уровень 1 · площадка 47",
			exact: true,
		}),
	).toBeVisible();
	await expect(page.locator(".td-site")).toHaveCount(58);
	await page
		.locator(".td-scroll")
		.screenshot({ path: "test-results/defense-desert.png", scale: "css" });
});

test("ordinary arrows remain visible in flight toward the target", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const visiblePixels = await page.evaluate(async () => {
		const sessionEntry = "/src/games/defense/session.ts",
			rendererEntry = "/src/games/defense/renderer.ts",
			assetsEntry = "/src/games/defense/assets.ts";
		const { createDefenseSession } = await import(sessionEntry);
		const { DefenseRenderer } = await import(rendererEntry);
		const { loadAssets } = await import(assetsEntry);
		const session = await createDefenseSession({ seed: "ordinary-arrow" });
		session.startWave();
		session.build(0, "arrow");
		session.step();
		const state = session.snapshot();
		state.enemies[0].distance = 174;
		state.shots = [
			{
				from: { x: 245, y: 140 },
				to: { x: 305, y: 140 },
				sprite: "arrow",
				fire: false,
				age: 0.18,
			},
		];
		const canvas = document.createElement("canvas");
		canvas.id = "arrow-preview";
		canvas.style.width = "390px";
		canvas.style.height = "580px";
		document.body.append(canvas);
		const renderer = new DefenseRenderer(canvas, await loadAssets());
		renderer.draw(state, null);
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("No canvas");
		const scale = canvas.width / 390;
		const pixels = ctx.getImageData(
			274 * scale,
			117 * scale,
			20 * scale,
			18 * scale,
		).data;
		let count = 0;
		for (let i = 0; i < pixels.length; i += 4)
			if (pixels[i] > 220 && pixels[i + 1] > 220 && pixels[i + 2] > 200)
				count++;
		await session.destroy();
		return count;
	});
	expect(visiblePixels).toBeGreaterThan(10);
	await page
		.locator("#arrow-preview")
		.screenshot({ path: "test-results/defense-arrow.png", scale: "css" });
});

test("chapter completion collapses the old castle and smoothly reveals the next zone", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const saved = await page.evaluate(async () => {
		const entry = "/src/games/defense/session.ts";
		const { createDefenseSession } = await import(entry);
		const session = await createDefenseSession({ seed: "chapter-travel" });
		const state = session.snapshot();
		await session.destroy();
		state.wave = 3;
		state.completedWaves = 3;
		state.phase = "reward";
		state.relics = ["chain", "stacks"];
		state.offers = [];
		return JSON.stringify({ version: "gdd-2", run: state });
	});
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
	await page.getByRole("button", { name: "Продолжить", exact: true }).click();
	const next = page.getByRole("button", {
		name: "Следующая волна",
		exact: true,
	});
	await expect(next).toBeDisabled();
	await expect(
		page.getByRole("group", { name: "Глава 2: Осенняя роща", exact: true }),
	).toBeVisible();
	await expect
		.poll(() => page.locator(".td-scroll").evaluate((node) => node.scrollTop))
		.toBeGreaterThan(500);
	await page.waitForTimeout(700);
	await page.locator(".defense").screenshot({
		path: "test-results/defense-castle-collapse.png",
		scale: "css",
	});
	await expect(next).toBeEnabled({ timeout: 5000 });
	expect(
		await page.locator(".td-scroll").evaluate((node) => node.scrollTop),
	).toBe(0);
	await page.locator(".defense").screenshot({
		path: "test-results/defense-next-chapter.png",
		scale: "css",
	});
	await next.click();
	await expect(
		page.getByRole("button", { name: "Идёт волна", exact: true }),
	).toBeDisabled();
});

test("a dense burning wave remains readable with movement spacing", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const gap = await page.evaluate(async () => {
		const sessionEntry = "/src/games/defense/session.ts";
		const rendererEntry = "/src/games/defense/renderer.ts";
		const assetsEntry = "/src/games/defense/assets.ts";
		const { createDefenseSession } = await import(sessionEntry);
		const { DefenseRenderer } = await import(rendererEntry);
		const { loadAssets } = await import(assetsEntry);
		const initial = await createDefenseSession({ seed: "readable-crowd" });
		initial.startWave();
		const seed = initial.snapshot();
		seed.wave = 18;
		seed.remaining = 54;
		await initial.destroy();
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-2", run: seed }),
		});
		session.step(600);
		const state = session.snapshot();
		for (const enemy of state.enemies) {
			enemy.oil = 5;
			enemy.burn = 3;
			enemy.burnStacks = 3;
			enemy.hp *= 0.6;
		}
		const canvas = document.createElement("canvas");
		canvas.id = "spaced-crowd";
		canvas.style.width = "390px";
		canvas.style.height = "580px";
		document.body.append(canvas);
		const renderer = new DefenseRenderer(canvas, await loadAssets());
		renderer.draw(state, null);
		let minimum = Infinity;
		for (let i = 1; i < state.enemies.length; i++)
			minimum = Math.min(
				minimum,
				state.enemies[i - 1].distance - state.enemies[i].distance,
			);
		await session.destroy();
		return minimum;
	});
	expect(gap).toBeGreaterThanOrEqual(27.99);
	await page.locator("#spaced-crowd").screenshot({
		path: "test-results/defense-spaced-crowd.png",
		scale: "css",
	});
});

test("construction is drag only and a built tower sells only when dropped on the bin", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=drag-sale");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	await page
		.getByRole("button", { name: "Стрелковая · 60", exact: true })
		.click();
	await page.getByRole("button", { name: "Площадка 1", exact: true }).click();
	await expect(page.locator(".td-detail")).toBeHidden();
	await expect(
		page.getByRole("button", { name: /Стрелковая · уровень/ }),
	).toHaveCount(0);
	await dragTowerTo(page, "Стрелковая · 60", "Площадка 1");
	await page.getByRole("button", { name: "Улучшить · 40" }).click();
	const tower = page.getByRole("button", {
		name: "Стрелковая · уровень 2 · площадка 1",
		exact: true,
	});
	const a = await tower.boundingBox();
	if (!a) throw new Error("Missing tower");
	await expect(page.locator(".td-sale")).toBeHidden();
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
	await page.mouse.down();
	await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2);
	const bin = page.locator(".td-sale");
	await expect(bin).toBeVisible();
	await expect(bin).toHaveAttribute("aria-label", "Продать башню за 50");
	await page
		.locator(".td-field")
		.dispatchEvent("pointercancel", { pointerId: 1 });
	await page.mouse.up();
	await expect(bin).toBeHidden();
	await expect(tower).toBeVisible();
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
	await page.mouse.down();
	await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2);
	const b = await bin.boundingBox();
	if (!b) throw new Error("Missing bin");
	await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/defense-sale.png", scale: "css" });
	await page.mouse.up();
	await expect(bin).toBeHidden();
	await expect(
		page.getByRole("button", { name: "Площадка 1", exact: true }),
	).toBeVisible();
	await page.reload();
	await expect(
		page.getByRole("button", { name: "Площадка 1", exact: true }),
	).toBeVisible();
});

test("an oiled enemy does not slow its neighbours or move them sideways", async ({
	page,
}) => {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const result = await page.evaluate(async () => {
		const sessionEntry = "/src/games/defense/session.ts";
		const rendererEntry = "/src/games/defense/renderer.ts";
		const assetsEntry = "/src/games/defense/assets.ts";
		const boardEntry = "/src/games/defense/board.ts";
		const { createDefenseSession } = await import(sessionEntry);
		const { DefenseRenderer } = await import(rendererEntry);
		const { loadAssets } = await import(assetsEntry);
		const { pointOnRoad } = await import(boardEntry);
		const initial = await createDefenseSession({ seed: "passing" });
		initial.startWave();
		initial.step();
		const state = initial.snapshot();
		const enemy = state.enemies[0];
		state.remaining = 0;
		state.enemies = [
			{ ...enemy, id: 1, distance: 150, oil: 5, slow: 0.45 },
			{ ...enemy, id: 2, distance: 120 },
		];
		await initial.destroy();
		const session = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-2", run: state }),
		});
		session.step(120);
		const after = session.snapshot();
		const a = pointOnRoad(after.enemies[0].distance, 1);
		const b = pointOnRoad(after.enemies[1].distance, 1);
		const canvas = document.createElement("canvas");
		canvas.id = "passing-preview";
		canvas.style.width = "390px";
		canvas.style.height = "580px";
		document.body.append(canvas);
		new DefenseRenderer(canvas, await loadAssets()).draw(after, null);
		await session.destroy();
		return {
			slow: after.enemies[0].distance,
			fast: after.enemies[1].distance,
			sideways: Math.abs(b.x - a.x),
		};
	});
	expect(result.fast).toBeCloseTo(216, 3);
	expect(result.slow).toBeCloseTo(202.8, 3);
	expect(result.sideways).toBe(0);
	await page
		.locator("#passing-preview")
		.screenshot({ path: "test-results/defense-passing.png", scale: "css" });
});

test("battle speed cycles through one two and three without changing pause", async ({
	page,
}) => {
	await page.clock.install();
	await page.goto("/?game=defense&seed=speed");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	async function elapsed() {
		return page.evaluate(
			() =>
				JSON.parse(localStorage.getItem("game25:defense:v1")!).run
					.elapsedSeconds,
		);
	}
	await page.clock.runFor(3100);
	const normal = await elapsed();
	await page
		.getByRole("button", { name: "Скорость боя ×1", exact: true })
		.click();
	await page.clock.runFor(3000);
	const double = await elapsed();
	expect(double - normal).toBeCloseTo(6, 0);
	await page
		.getByRole("button", { name: "Скорость боя ×2", exact: true })
		.click();
	await page.clock.runFor(3000);
	const triple = await elapsed();
	expect(triple - double).toBeCloseTo(9, 0);
	await page.getByRole("button", { name: "Пауза боя", exact: true }).click();
	await page.clock.runFor(3000);
	expect(await elapsed()).toBe(triple);
	await page
		.getByRole("button", { name: "Скорость боя ×3", exact: true })
		.click();
	await expect(
		page.getByRole("button", { name: "Скорость боя ×1", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Продолжить бой", exact: true }),
	).toBeVisible();
});
