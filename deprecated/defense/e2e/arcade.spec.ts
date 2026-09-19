import { distanceToRoad } from "../src/games/defense/board";
import { starterChoices } from "../src/games/defense/rewards";
import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

async function buildableCells(page: Page, range = Infinity): Promise<number[]> {
	const cells = await page
		.locator(".defense-cell:not(:disabled)")
		.evaluateAll((buttons) =>
			buttons.map((button) =>
				Number(button.getAttribute("aria-label")!.split(" ")[1]),
			),
		);
	if (range === Infinity) return cells;
	const map = await page.evaluate(
		() => JSON.parse(localStorage.getItem("game25:defense:v1")!).state.map,
	);
	return cells.filter((cell) => distanceToRoad(map, cell - 1) < range);
}

async function confirmDraftSelection(page: Page): Promise<void> {
	const confirm = page.locator('[data-ui-id="confirm-reward"]');
	if (await confirm.isVisible()) await confirm.tap();
}

test("mobile construction, pause, save, reload and game switching", async ({
	page,
}) => {
	await page.addInitScript({
		content: `
		const frames = new Set();
		const request = window.requestAnimationFrame.bind(window);
		const cancel = window.cancelAnimationFrame.bind(window);
		window.requestAnimationFrame = callback => { let id = request(time => { frames.delete(id); callback(time); }); frames.add(id); return id; };
		window.cancelAnimationFrame = id => { frames.delete(id); cancel(id); };
		const watched = new Set(["keydown", "keyup", "pointerdown", "pointermove", "pointerup", "pointercancel", "pointerleave", "blur", "visibilitychange", "pagehide"]);
		const listeners = [];
		const add = EventTarget.prototype.addEventListener;
		const remove = EventTarget.prototype.removeEventListener;
		EventTarget.prototype.addEventListener = function(type, fn, options) { if (watched.has(type) && !listeners.some(l => l.target === this && l.type === type && l.fn === fn)) listeners.push({target: this, type, fn}); return add.call(this, type, fn, options); };
		EventTarget.prototype.removeEventListener = function(type, fn, options) { const index = listeners.findIndex(l => l.target === this && l.type === type && l.fn === fn); if (index >= 0) listeners.splice(index, 1); return remove.call(this, type, fn, options); };
		const contexts = [];
		const OriginalAudioContext = window.AudioContext;
		window.AudioContext = class extends OriginalAudioContext { constructor(...args) { super(...args); contexts.push(this); } };
		window.__lifecycle = () => ({ frames: frames.size, listeners: listeners.length, audio: contexts.filter(context => context.state !== "closed").length });
	`,
	});

	await page.goto("/?seed=browser");
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	await confirmDraftSelection(page);
	await page.getByRole("button", { name: "Стрелок · 30" }).tap();
	await page.locator(".defense-cell:not(:disabled)").first().tap();
	await expect(page.locator(".defense-status")).toContainText("◈ 60");
	await page.getByRole("button", { name: "Начать волну 1" }).tap();
	await page.getByRole("button", { name: "Пауза", exact: true }).tap();
	await expect(page.locator(".defense-status")).toContainText("Пауза");
	await expect.poll(() => page.evaluate("window.__lifecycle().frames")).toBe(0);
	await page.evaluate(() => {
		Object.defineProperty(document, "hidden", {
			configurable: true,
			value: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));
		Object.defineProperty(document, "hidden", {
			configurable: true,
			value: false,
		});
		document.dispatchEvent(new Event("visibilitychange"));
		Reflect.deleteProperty(document, "hidden");
	});
	await expect(page.locator(".defense-status")).toContainText("Пауза");
	expect(await page.evaluate("window.__lifecycle().frames")).toBe(0);
	const paused = await page.evaluate(() =>
		localStorage.getItem("game25:defense:v1"),
	);
	await page.waitForTimeout(250);
	expect(
		await page.evaluate(() => localStorage.getItem("game25:defense:v1")),
	).toBe(paused);
	await page.reload();
	await expect(page.locator(".defense-status")).toContainText("Волна 1");
	await page.getByRole("button", { name: "Платформер", exact: true }).tap();
	await expect(page.locator(".jumper-stage canvas")).toBeVisible();
	await expect(page.locator(".defense")).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Платформер", exact: true }),
	).toBeEnabled();
	await expect.poll(() => page.evaluate("window.__lifecycle().frames")).toBe(1);
	const jumperLifecycle = await page.evaluate("window.__lifecycle()");
	expect(jumperLifecycle.frames).toBe(1);
	await page.getByRole("button", { name: "Пауза", exact: true }).tap();
	await page.evaluate(() => {
		Object.defineProperty(document, "hidden", {
			configurable: true,
			value: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));
		Object.defineProperty(document, "hidden", {
			configurable: true,
			value: false,
		});
		document.dispatchEvent(new Event("visibilitychange"));
		Reflect.deleteProperty(document, "hidden");
	});
	expect(await page.evaluate("window.__lifecycle().frames")).toBe(0);
	await page.getByRole("button", { name: "Продолжить", exact: true }).tap();
	await expect.poll(() => page.evaluate("window.__lifecycle().frames")).toBe(1);
	await page.getByRole("button", { name: "Оборона", exact: true }).tap();
	await expect(
		page.locator(".defense-board > canvas[aria-label]"),
	).toBeVisible();
	await expect(page.locator(".jumper-stage")).toHaveCount(0);
	await expect(page.locator(".touch-hints")).toHaveCount(0);
	await expect.poll(() => page.evaluate("window.__lifecycle().audio")).toBe(0);
	await expect.poll(() => page.evaluate("window.__lifecycle().frames")).toBe(1);
	await page.getByRole("button", { name: "Платформер", exact: true }).tap();
	await expect(page.locator(".jumper-stage canvas")).toHaveCount(1);
	await expect(page.locator(".touch-hints")).toHaveCount(1);
	await expect
		.poll(() => page.evaluate("window.__lifecycle()"))
		.toEqual(jumperLifecycle);
});

test("a save failure is visible and does not block play or game switching", async ({
	page,
}) => {
	await page.addInitScript(() => {
		Storage.prototype.setItem = () => {
			throw new DOMException("Storage full", "QuotaExceededError");
		};
	});
	await page.goto("/");
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	await expect(page.locator(".arcade > [role=status]")).toContainText(
		"Не удалось сохранить забег",
	);
	await page.getByRole("button", { name: "Стрелок · 30" }).tap();
	await page.locator(".defense-cell:not(:disabled)").first().tap();
	await expect(page.locator(".defense-status")).toContainText("◈ 60");
	await page.getByRole("button", { name: "Платформер", exact: true }).tap();
	await expect(page.locator(".jumper-stage canvas")).toBeVisible();
	await expect(page.locator(".defense")).toHaveCount(0);
	await expect(page.locator(".arcade > [role=status]")).toContainText(
		"Не удалось сохранить забег",
	);
	await page.screenshot({ path: "test-results/defense-save-error.png" });
	await page.getByRole("button", { name: "Оборона", exact: true }).tap();
	await expect(
		page.getByRole("dialog", { name: "Выбор стартовой сборки" }),
	).toBeVisible();
});

test("recovers from invalid storage and restarts a run", async ({ page }) => {
	await page.addInitScript(() =>
		localStorage.setItem("game25:defense:v1", "invalid"),
	);
	await page.goto("/");
	await expect(
		page.getByText("Не удалось прочитать сохранение. Начат новый забег."),
	).toBeVisible();
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	await page.getByRole("button", { name: "Стрелок · 30" }).tap();
	await page.locator(".defense-cell:not(:disabled)").first().tap();
	await page.getByRole("button", { name: "Заново", exact: true }).tap();
	await expect(
		page.getByRole("dialog", { name: "Выбор стартовой сборки" }),
	).toBeVisible();
	await page.screenshot({
		path: "test-results/defense-mobile.png",
		fullPage: true,
	});
});

test("winter build and full-screen reward survive reload", async ({ page }) => {
	test.setTimeout(90000);
	await page.clock.install();
	await page.goto("/?seed=test");
	const winterSeed = Array.from(
		{ length: 100 },
		(_, i) => `winter-ui-${i}`,
	).find((seed) => starterChoices(seed).includes("winter"))!;
	await page.locator(".defense-seed summary").click();
	await page.getByLabel("Код забега", { exact: true }).fill(winterSeed);
	await page
		.getByRole("button", { name: "Новый забег по коду", exact: true })
		.click();
	await page.locator(".defense-seed summary").click();
	await page.getByRole("button", { name: "Зимний фронт", exact: true }).tap();
	await confirmDraftSelection(page);
	await expect(
		page.getByRole("button", { name: "Сначала размести эффект мира" }),
	).toBeDisabled();
	await page.getByRole("button", { name: "Клетка 17", exact: true }).tap();
	await page
		.getByRole("button", { name: "Разместить снег", exact: true })
		.tap();
	const cells = await buildableCells(page);
	for (const [index, name] of ["Стрелок", "Аркана", "Мортира"].entries()) {
		const cell = cells[index];
		await page.getByRole("button", { name: `${name} · 30`, exact: true }).tap();
		await page
			.getByRole("button", { name: `Клетка ${cell}`, exact: true })
			.tap();
	}
	await page.screenshot({ path: "test-results/defense-grid.png" });
	await page.getByRole("button", { name: "Начать волну 1", exact: true }).tap();
	await page.clock.runFor(3000);
	await page.screenshot({ path: "test-results/defense-statuses.png" });
	await page.clock.runFor(42000);
	const reward = page.getByRole("dialog", { name: "Выбор награды" });
	await expect(reward).toBeVisible();
	await expect(reward.getByRole("button")).toHaveCount(1);
	await page.screenshot({ path: "test-results/defense-reward.png" });
	const rewardSave = await page.evaluate(() =>
		localStorage.getItem("game25:defense:v1")!,
	);
	await reward
		.locator(
			'button:not([data-ui-id="reward-portal"]):not([data-ui-id="reward-snowfall"])',
		)
		.first()
		.tap();
	await expect(
		page.getByRole("button", { name: "Начать волну 2", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Начать волну 2", exact: true }),
	).toBeEnabled();
	await page.addInitScript((saved) => {
		if (sessionStorage.getItem("reward-restored")) return;
		localStorage.setItem("game25:defense:v1", saved);
		sessionStorage.setItem("reward-restored", "true");
	}, rewardSave);
	await page.reload();
	await expect(reward).toBeVisible();
	await reward.getByRole("button").tap();
	await page.reload();
	await expect(
		page.getByRole("button", { name: "Начать волну 2", exact: true }),
	).toBeEnabled();
	const saved = await page.evaluate(() =>
		JSON.parse(localStorage.getItem("game25:defense:v1")!),
	);
	expect(saved.version).toBe(7);
	expect(saved.state.snow).toBe(16);
	await page.screenshot({ path: "test-results/defense-world.png" });
});

test("tower menu offers upgrade and sale without shifting the board or play button", async ({
	page,
}) => {
	await page.goto("/?seed=construction");
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	const [cell] = await buildableCells(page, 72);
	const board = page.locator(".defense-board");
	const before = await board.boundingBox();
	const play = page.getByRole("button", {
		name: "Начать волну 1",
		exact: true,
	});
	const playBefore = await play.boundingBox();
	await page.getByRole("button", { name: `Клетка ${cell}`, exact: true }).tap();
	await page.getByRole("button", { name: "Стрелок · 30", exact: true }).tap();
	await expect(
		page.getByRole("button", { name: "Перенести / обменять" }),
	).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Заменить", exact: true }),
	).toHaveCount(0);
	await page.getByRole("button", { name: "Усилить · 35", exact: true }).tap();
	await expect(
		page.getByRole("button", { name: "Продать · +32", exact: true }),
	).toBeVisible();
	expect(await board.boundingBox()).toEqual(before);
	expect(await play.boundingBox()).toEqual(playBefore);
	await page.getByRole("button", { name: "Продать · +32", exact: true }).tap();
	await expect(page.locator(".defense-controls")).toBeHidden();
	expect(await board.boundingBox()).toEqual(before);
	await play.tap();
	await expect(
		page.getByRole("button", { name: "Волна идёт", exact: true }),
	).toBeDisabled();
	expect(await board.boundingBox()).toEqual(before);
});

test("Canvas menu supports pause, resize, keyboard and touch", async ({
	page,
}) => {
	await page.goto("/?seed=canvas-ui");
	const dialog = page.getByRole("dialog", { name: "Выбор стартовой сборки" });
	await expect(dialog.locator("canvas")).toBeVisible();
	await expect(dialog.locator("h1")).toHaveCount(0);
	const choice = dialog
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first();
	await page.getByRole("button", { name: "Пауза", exact: true }).tap();
	await expect(choice).toBeDisabled();
	await page.setViewportSize({ width: 360, height: 800 });
	await expect(choice).toBeDisabled();
	await page.getByRole("button", { name: "Продолжить", exact: true }).tap();
	await expect(choice).toBeEnabled();
	await choice.focus();
	await page.keyboard.press("Enter");
	await expect(dialog).not.toBeVisible();
	await page.getByRole("button", { name: "Заново", exact: true }).tap();
	await expect(dialog).toBeVisible();
	const bounds = await choice.boundingBox();
	await page.touchscreen.tap(
		bounds!.x + bounds!.width / 2,
		bounds!.y + bounds!.height / 2,
	);
	await expect(dialog).not.toBeVisible();
	await expect(
		page.getByRole("button", { name: "Начать волну 1", exact: true }),
	).toBeEnabled();
});

test("generated maps replay by code, survive reload and change seed on a new run", async ({
	page,
}) => {
	await page.goto("/?seed=share-this-run");
	await expect(
		page.getByRole("dialog", { name: "Выбор стартовой сборки" }),
	).toBeVisible();
	const read = () =>
		page.evaluate(
			() => JSON.parse(localStorage.getItem("game25:defense:v1")!).state,
		);
	const initial = await read();
	expect(initial.seed).toBe("share-this-run");
	expect(initial.map.paths.length).toBeGreaterThanOrEqual(3);
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	await page.getByRole("button", { name: "Начать волну 1", exact: true }).tap();
	await page.getByRole("button", { name: "Пауза", exact: true }).tap();
	const paused = await read();
	await page.reload();
	expect((await read()).map).toEqual(initial.map);
	expect((await read()).seed).toBe(paused.seed);
	await page.getByRole("button", { name: "Заново", exact: true }).tap();
	await expect(
		page.getByRole("dialog", { name: "Выбор стартовой сборки" }),
	).toBeVisible();
	expect((await read()).seed).not.toBe(initial.seed);
	await page.locator(".defense-seed summary").click();
	await page.getByLabel("Код забега", { exact: true }).fill(initial.seed);
	await page
		.getByRole("button", { name: "Новый забег по коду", exact: true })
		.click();
	const repeated = await read();
	expect(repeated.seed).toBe(initial.seed);
	expect(repeated.map).toEqual(initial.map);
	expect(repeated.phase).toBe("draft");
	await page.locator(".defense-seed summary").click();
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	await page.screenshot({
		path: "test-results/generated-map.png",
		fullPage: true,
	});
});

test("Canvas defense fits portrait phones and keeps reward text in page flow", async ({
	page,
}) => {
	for (const width of [360, 390, 430]) {
		await page.setViewportSize({ width, height: 844 });
		await page.goto("/?seed=portrait");
		await page.getByRole("button", { name: "Заново", exact: true }).tap();
		const dialog = page.getByRole("dialog", { name: "Выбор стартовой сборки" });
		await expect(dialog).toBeVisible();
		expect(
			await page
				.locator(".defense")
				.evaluate((node) => node.scrollWidth <= node.clientWidth),
		).toBe(true);
		await page.screenshot({
			path: `test-results/native-draft-${width}.png`,
			fullPage: true,
		});
		await dialog
			.getByRole("button", {
				name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
			})
			.first()
			.tap();
		await confirmDraftSelection(page);
		const board = await page.locator(".defense-board").boundingBox();
		const controls = await page.locator(".defense-tray").boundingBox();
		const tray = await page.locator(".defense-tray").boundingBox();
		expect(board!.x).toBeLessThanOrEqual(4);
		expect(Math.abs(board!.width - (width - 8))).toBeLessThan(1);
		for (const panel of [tray!, controls!]) {
			expect(Math.abs(panel.x - board!.x)).toBeLessThan(1);
			expect(Math.abs(panel.width - board!.width)).toBeLessThan(1);
		}
		for (const card of await page
			.locator('.defense-tray button[data-ui-id^="build-"]')
			.all()) {
			const bounds = await card.boundingBox();
			expect(bounds!.width).toBeLessThanOrEqual(60);
			expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
				board!.x + board!.width,
			);
		}

		expect(controls!.y + controls!.height).toBeLessThanOrEqual(board!.y);
		await expect(
			page.getByRole("button", { name: "Начать волну 1", exact: true }),
		).toBeInViewport();
		await page.screenshot({
			path: `test-results/native-play-${width}.png`,
			fullPage: true,
		});
	}
});

test("selects a Canvas tower card and plants it without DOM pointer targets", async ({
	page,
}) => {
	await page.goto("/?seed=plant-tower");
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	const [cell] = await buildableCells(page, 96);
	const card = page.getByRole("button", { name: "Стрелок · 30", exact: true });
	const box = await card.boundingBox();
	await page.locator(".defense-tray button").evaluateAll((buttons) =>
		buttons.forEach((button) => {
			button.style.pointerEvents = "none";
		}),
	);
	await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
	await expect(card).toHaveAttribute("aria-pressed", "true");
	// Selection redraws the tray immediately, without fading every card out.
	expect(
		await page.locator(".defense-tray canvas").evaluate((node) => {
			const canvas = node as HTMLCanvasElement;
			return canvas.getContext("2d")!.getImageData(20, 20, 1, 1).data[3];
		}),
	).toBe(255);
	expect(box!.height).toBeLessThanOrEqual(64);

	const target = await page
		.getByRole("button", { name: `Клетка ${cell}`, exact: true })
		.boundingBox();
	await page.locator(".defense-cell").evaluateAll((buttons) =>
		buttons.forEach((button) => {
			button.style.pointerEvents = "none";
		}),
	);
	await page.touchscreen.tap(
		target!.x + target!.width / 2,
		target!.y + target!.height / 2,
	);
	const saved = await page.evaluate(() =>
		JSON.parse(localStorage.getItem("game25:defense:v1")!),
	);
	expect(saved.state.towers).toMatchObject([{ kind: "rapid", slot: cell - 1 }]);
	expect(saved.state.coins).toBe(60);
	await page.screenshot({
		path: "test-results/canvas-plant-tower.png",
		fullPage: true,
	});
});

test("tower tray stays visible when inspecting a tower and during combat", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto("/?seed=permanent-tray");
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	const [cell] = await buildableCells(page, 96);
	await page.getByRole("button", { name: "Стрелок · 30", exact: true }).tap();
	await page.getByRole("button", { name: `Клетка ${cell}`, exact: true }).tap();
	await page.getByRole("button", { name: `Клетка ${cell}`, exact: true }).tap();
	await expect(page.locator(".defense-tray")).toBeVisible();
	await expect(
		page.locator('.defense-tray button[data-ui-id^="build-"]'),
	).toHaveCount(6);
	const actionHeights = await page
		.locator(".defense-controls button")
		.evaluateAll((buttons) =>
			buttons.map((button) => button.getBoundingClientRect().height),
		);
	expect(actionHeights.every((height) => Math.abs(height - 44) < 1)).toBe(true);
	await page.screenshot({
		path: "test-results/permanent-tray-inspect.png",
		fullPage: true,
	});

	await page.getByRole("button", { name: "Закрыть", exact: true }).tap();
	await page.getByRole("button", { name: "Начать волну 1", exact: true }).tap();
	await expect(page.locator(".defense-tray")).toBeVisible();
	await expect(
		page.locator('.defense-tray button[data-ui-id^="build-"]:disabled'),
	).toHaveCount(6);
	await page.screenshot({
		path: "test-results/permanent-tray-combat.png",
		fullPage: true,
	});
});

test("touch dragging moves and swaps towers; invalid drops and cancellation preserve the save", async ({
	page,
}) => {
	await page.goto("/?seed=drag-towers");
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	const [a, b, c] = await buildableCells(page, 96);
	await page.getByRole("button", { name: "Стрелок · 30", exact: true }).tap();
	await page.getByRole("button", { name: `Клетка ${a}`, exact: true }).tap();
	await page.getByRole("button", { name: "Аркана · 30", exact: true }).tap();
	await page.getByRole("button", { name: `Клетка ${b}`, exact: true }).tap();
	const read = () =>
		page.evaluate(
			() => JSON.parse(localStorage.getItem("game25:defense:v1")!).state,
		);
	const point = async (cell: number) => {
		const box = await page
			.getByRole("button", { name: `Клетка ${cell}`, exact: true })
			.boundingBox();
		return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
	};
	const client = await page.context().newCDPSession(page);
	const drag = async (from: number, to: number, cancel = false) => {
		const before = await read();
		await client.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [await point(from)],
		});
		await client.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: [await point(to)],
		});
		expect(await read()).toEqual(before);
		await page.screenshot({ path: "test-results/tower-drag.png" });
		await client.send("Input.dispatchTouchEvent", {
			type: cancel ? "touchCancel" : "touchEnd",
			touchPoints: [],
		});
	};
	await drag(a, c);
	expect((await read()).towers).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ slot: c - 1, kind: "rapid" }),
		]),
	);
	await drag(c, b);
	expect((await read()).towers).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ slot: b - 1, kind: "rapid" }),
			expect.objectContaining({ slot: c - 1, kind: "arcane" }),
		]),
	);
	const before = await read();
	const road = Number(
		(await page
			.locator(".defense-cell:disabled")
			.first()
			.getAttribute("aria-label"))!.split(" ")[1],
	);
	await drag(b, road);
	expect(await read()).toEqual(before);
	await drag(b, a, true);
	expect(await read()).toEqual(before);
	await page.getByRole("button", { name: "Пауза", exact: true }).tap();
	await drag(b, a);
	expect(await read()).toEqual(before);
	await client.detach();
});

test("opening draft changes between codes and repeats after reload", async ({
	page,
}) => {
	const drafts = new Set<string>();
	for (const seed of ["opening-1", "opening-2", "opening-3", "opening-4"]) {
		await page.goto(`/?seed=${seed}`);
		await page.evaluate(() => localStorage.removeItem("game25:defense:v1"));
		await page.reload();
		const choices = () =>
			page
				.locator('.defense-reward-screen button[data-ui-id^="reward-"]')
				.evaluateAll((buttons) =>
					buttons.map((button) => button.getAttribute("aria-label")),
				);
		await expect(page.locator(".defense-reward-screen button")).toHaveCount(4);
		const first = await choices();
		expect(first).toHaveLength(3);
		drafts.add([...first].sort().join(","));
		await page.reload();
		await expect(page.locator(".defense-reward-screen button")).toHaveCount(4);
		expect(await choices()).toEqual(first);
	}
	expect(drafts.size).toBeGreaterThan(1);
});

test("touch dragging a new tower from the canvas tray builds only on a valid drop", async ({
	page,
}) => {
	await page.goto("/?seed=drag-new-towers");
	await page
		.getByRole("button", {
			name: /Перекрёстный огонь|Тяжёлая батарея|Быстрый залп|Ледяная охота/,
		})
		.first()
		.tap();
	const [a, b] = await buildableCells(page, 96);
	const read = () =>
		page.evaluate(
			() => JSON.parse(localStorage.getItem("game25:defense:v1")!).state,
		);
	const point = async (selector: string) => {
		const box = await page.locator(selector).boundingBox();
		return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
	};
	const client = await page.context().newCDPSession(page);
	const drag = async (target: { x: number; y: number }, cancel = false) => {
		const before = await read();
		const source = await point('[data-ui-id="build-rapid"]');
		await page.locator(".defense-tray button").evaluateAll((buttons) =>
			buttons.forEach((button) => {
				(button as HTMLElement).style.pointerEvents = "none";
			}),
		);
		await client.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [source],
		});
		await client.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: [target],
		});
		expect(await read()).toEqual(before);
		await client.send("Input.dispatchTouchEvent", {
			type: cancel ? "touchCancel" : "touchEnd",
			touchPoints: [],
		});
	};
	// A previously selected empty cell must not receive the dragged tower.
	await page.getByRole("button", { name: `Клетка ${b}`, exact: true }).tap();
	const before = await read();
	const occupiedPoint = await point(`[aria-label="Клетка ${a}"]`);
	await drag(occupiedPoint);
	const built = await read();
	expect(built.towers).toHaveLength(1);
	expect(built.towers[0]).toMatchObject({ slot: a - 1, kind: "rapid" });
	expect(built.coins).toBe(before.coins - 30);
	await drag(occupiedPoint);
	expect(await read()).toEqual(built);
	await drag(await point(".defense-cell:disabled >> nth=0"));
	expect(await read()).toEqual(built);
	await drag({ x: 2, y: 2 });
	expect(await read()).toEqual(built);
	await drag(await point(`[aria-label="Клетка ${b}"]`), true);
	expect(await read()).toEqual(built);
	await page.getByRole("button", { name: "Пауза", exact: true }).tap();
	await drag(await point(`[aria-label="Клетка ${b}"]`));
	expect(await read()).toEqual(built);
	await client.detach();
});

test("embedded defense exposes progress and events through its public API", async ({
	page,
}) => {
	await page.goto("/");
	const result = await page.evaluate(async () => {
		const entry = "/src/games/defense/browser.ts";
		const { mountDefense } = await import(entry);
		const node = document.createElement("div");
		document.body.append(node);
		let saved = "";
		const events: {
			type: string;
			progress: { completedWaves: number; runId: string };
		}[] = [];
		const game = await mountDefense(node, {
			seed: "embed-api",
			onSave: (value: string) => {
				saved = value;
			},
			onEvent: (event: (typeof events)[number]) => {
				events.push(event);
			},
		});
		const draft = game.getProgress();
		node
			.querySelector<HTMLButtonElement>(
				'button[data-ui-id^="reward-"]:not([data-ui-id="reward-winter"]):not([data-ui-id="reward-rift"])',
			)!
			.click();
		node
			.querySelector<HTMLButtonElement>('button[data-ui-id="confirm-reward"]')!
			.click();
		game.pause();
		const started = game.getProgress();
		await game.destroy();
		const checkpoint = JSON.parse(saved);
		Object.assign(checkpoint.state, {
			phase: "wave",
			wave: 18,
			remaining: 0,
			enemies: [],
			towers: [],
		});
		let completed!: () => void;
		const completion = new Promise<void>((resolve) => {
			completed = resolve;
		});
		const restored = await mountDefense(node, {
			saved: JSON.stringify(checkpoint),
			onEvent: (event: (typeof events)[number]) => {
				events.push(event);
				completed();
			},
		});
		await completion;
		restored.pause();
		const progress = restored.getProgress();
		await restored.destroy();
		node.remove();
		return { draft, started, progress, events };
	});
	expect(result.draft.phase).toBe("draft");
	expect(result.started.phase).toBe("prepare");
	expect(result.events.map((event) => event.type)).toEqual([
		"runStarted",
		"waveCompleted",
	]);
	expect(result.progress).toMatchObject({
		runId: result.draft.runId,
		phase: "reward",
		currentWave: 18,
		completedWaves: 18,
	});
});
