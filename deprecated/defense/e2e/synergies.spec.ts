import { test, expect } from "./fixtures";

test("six towers, guided shop and discovered chains work on a phone", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/?seed=synergy-phone");
	await expect(page.locator('[data-ui-id^="reward-"]')).toHaveCount(3);
	await page.waitForTimeout(100);
	await page.screenshot({
		path: "test-results/reward-cards-phone.png",
		fullPage: true,
	});
	await page
		.locator(
			'[data-ui-id^="reward-"]:not([data-ui-id="reward-winter"]):not([data-ui-id="reward-rift"])',
		)
		.first()
		.tap();
	await page.locator('[data-ui-id="confirm-reward"]').tap();
	await expect(
		page.locator('.defense-tray [data-ui-id^="build-"]'),
	).toHaveCount(6);
	const foundations = page.locator(".defense-cell:not(:disabled)");
	const siteCount = await page.evaluate(
		() =>
			JSON.parse(localStorage.getItem("game25:defense:v1")!).state.sites.length,
	);
	await expect(foundations).toHaveCount(siteCount);
	const chains = page.getByRole("button", { name: "Цепи", exact: true });
	await chains.tap();
	await expect(page.locator(".defense-strategy")).toContainText(
		"Пока ни одна цепь не сработала",
	);
	await expect(chains).toHaveAttribute("aria-pressed", "true");
	const shop = page.getByRole("button", { name: /^Магазин/ });
	await shop.tap();
	await expect(page.locator('[data-ui-id^="offer-"]')).toHaveCount(3);
	await expect(page.locator('[data-ui-id^="offer-"]').first()).toHaveAttribute(
		"aria-label",
		/ПРОДОЛЖЕНИЕ|НОВАЯ ВЕТВЬ|УСИЛЕНИЕ/,
	);
	await page.waitForTimeout(100);
	await page.locator(".defense-strategy").screenshot({
		path: "test-results/shop-cards-phone.png",
	});
	await page.locator('[data-ui-id="hold-selected"]').tap();
	const held = await page.evaluate(
		() =>
			JSON.parse(localStorage.getItem("game25:defense:v1")!).state.heldOffer,
	);
	await page.reload();
	await page.getByRole("button", { name: /^Магазин/ }).tap();
	await expect(page.locator('[data-ui-id="hold-selected"]')).toHaveAttribute(
		"aria-label",
		"◆ Закреплено",
	);
	await page.getByRole("button", { name: /^Магазин/ }).tap();
	await page.locator('[data-ui-id="build-rapid"]').tap();
	const cell = await foundations.first().getAttribute("aria-label");
	await foundations.first().tap();
	await page.locator('[data-ui-id="startWave"]').tap();
	await page.getByRole("button", { name: cell!, exact: true }).tap();
	await page.locator('[data-ui-id="overdrive"]').tap();
	await expect(page.locator('[data-ui-id="overdrive"]')).toHaveAttribute(
		"aria-label",
		"Форсаж · 1/2",
	);
	await page.locator('[data-ui-id="priority"]').tap();
	await expect(page.locator('[data-ui-id="priority"]')).toHaveAttribute(
		"aria-label",
		"Цель: Щиты",
	);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
	await page.screenshot({
		path: "test-results/synergy-phone.png",
		fullPage: true,
	});
});
