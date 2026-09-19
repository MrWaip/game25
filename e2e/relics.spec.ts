import { expect, test, type Page } from "@playwright/test";

async function openWith(page: Page, configure: string): Promise<void> {
	await page.goto("/?game=defense");
	await expect(
		page.getByRole("button", { name: "Плей", exact: true }),
	).toBeVisible();
	const saved = await page.evaluate(async (configure) => {
		const { createDefenseSession } =
			await import("/src/games/defense/session.ts");
		const session = await createDefenseSession({ seed: "relic-ui" });
		session.startWave();
		session.build(0, "arrow");
		session.build(1, "arrow");
		const state = session.snapshot();
		await session.destroy();
		for (const tower of state.towers) {
			tower.construction = 0;
			tower.constructionKind = null;
		}
		new Function("state", configure)(state);
		return JSON.stringify({ version: "gdd-8", run: state });
	}, configure);
	await page.addInitScript(
		(saved) => localStorage.setItem("game25:defense:v1", saved),
		saved,
	);
	await page.reload();
}

test("reward cards announce their rarity and the offer can be skipped", async ({
	page,
}) => {
	await openWith(
		page,
		`state.phase = "reward"; state.enemies = []; state.remaining = 0;
		state.offers = ["tar", "echo", "chain"];`,
	);
	await expect(
		page.getByRole("button", { name: "Цепной поджог", exact: true }),
	).toHaveAttribute("aria-description", /^Ключевая/);
	await expect(
		page.getByRole("button", { name: "Эхо", exact: true }),
	).toHaveAttribute("aria-description", /^Редкая/);
	await expect(
		page.getByRole("button", { name: "Смоляная бочка", exact: true }),
	).toHaveAttribute("aria-description", /^Обычная/);
	await page.waitForTimeout(700);
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/relic-rarity.png" });
	await page.getByRole("button", { name: "Пропустить", exact: true }).click();
	await expect(page.getByRole("dialog")).toBeHidden();
	await expect(
		page.getByRole("button", { name: "Следующая волна", exact: true }),
	).toBeEnabled();
});

test("with every slot taken the swap lists what each owned relic does", async ({
	page,
}) => {
	await openWith(
		page,
		`state.phase = "reward"; state.enemies = []; state.remaining = 0;
		state.relics = ["tar", "greed", "whetstone", "piggy", "bones"];
		state.piggyCoins = 9; state.towersBuilt = 4;
		state.offers = ["chain", "echo", "bridge"];`,
	);
	await page
		.getByRole("button", { name: "Цепной поджог", exact: true })
		.click();
	const discard = page.getByRole("button", {
		name: "Выбросить: Точило",
		exact: true,
	});
	await expect(discard).toHaveAttribute("aria-description", /построенную/);
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/relic-swap.png" });
	await discard.click();
	await expect(page.getByRole("dialog")).toBeHidden();
	await expect(
		page.getByRole("button", { name: "Реликвия: Цепной поджог", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Реликвия: Точило", exact: true }),
	).toHaveCount(0);
});

test("the relic bar is always visible and a slot opens its live counter", async ({
	page,
}) => {
	await openWith(
		page,
		`state.relics = ["piggy", "whetstone"]; state.piggyCoins = 12;
		state.towersBuilt = 7; state.enemies = []; state.remaining = 3;`,
	);
	const slot = page.getByRole("button", {
		name: "Реликвия: Свинья-копилка",
		exact: true,
	});
	await expect(slot).toHaveAttribute("aria-description", "Внутри 12 монет");
	await slot.click();
	await expect(
		page.getByRole("button", {
			name: "Закрыть: Свинья-копилка",
			exact: true,
		}),
	).toBeVisible();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/relic-info.png" });
	await page.getByRole("button", { name: "Сдвинуть вправо" }).click();
	await expect(
		page.getByRole("button", { name: "Реликвия: Свинья-копилка" }),
	).toHaveAttribute("data-ui-id", "relic-1");
});

test("tower buffs and enemy statuses are drawn on the field", async ({
	page,
}) => {
	await openWith(
		page,
		`state.relics = ["outpost", "whetstone", "battery"]; state.towersBuilt = 2;
		state.towers[0].rushed = 6;
		state.enemies = [
			{ id: 50, kind: "goblin", distance: 245, hp: 80, maxHp: 100, oil: 5, slow: 0,
			  acid: 3, vulnerability: 1.5, stun: 4, burn: 3, burnStacks: 2, spreadIn: 0 },
			{ id: 51, kind: "goblin", distance: 215, hp: 90, maxHp: 100, oil: 5, slow: 0.4,
			  acid: 0, vulnerability: 1, stun: 0, burn: 0, burnStacks: 0, spreadIn: 0 },
		];
		state.nextId = 52; state.remaining = 0;`,
	);
	await page.getByRole("button", { name: "Пауза боя" }).click();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/relic-field.png" });
	await page.getByRole("button", { name: "Продолжить бой" }).click();
	await page
		.getByRole("button", { name: /Стрелковая · уровень 1 · площадка 1/ })
		.click();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/relic-tower.png" });
});
