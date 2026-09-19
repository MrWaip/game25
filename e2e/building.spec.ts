import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";

async function dragTo(
	page: Page,
	from: string,
	to: string,
	offset = { x: 0, y: 0 },
) {
	const a = await page
		.getByRole("button", { name: from, exact: true })
		.boundingBox();
	const b = await page
		.getByRole("button", { name: to, exact: true })
		.boundingBox();
	if (!a || !b) throw new Error("Missing drag endpoint");
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		b.x + b.width / 2 + offset.x,
		b.y + b.height / 2 + offset.y,
		{ steps: 8 },
	);
	await page.mouse.up();
}

test("each drop inside a wave builds on the first attempt, centre or edge", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=building");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	// The purse only covers two towers, so the run is topped up first.
	await page.evaluate(() => {
		const scroll = document.querySelector(".td-scroll");
		if (scroll) scroll.scrollTop = 0;
	});
	for (const [index, slot] of [1, 2, 3].entries()) {
		await dragTo(page, "Стрелковая · 60", `Площадка ${slot}`, {
			x: index === 2 ? 14 : 0,
			y: index === 1 ? -12 : 0,
		});
		await expect(
			page.getByRole("button", {
				name: new RegExp(`Стрелковая · уровень 1 .*площадка ${slot}$`),
			}),
		).toBeVisible({ timeout: 3000 });
	}
});

test("outside a wave the tray refuses to build and says why", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=building-pause");
	const tower = page.getByRole("button", { name: "Стрелковая · 60" });
	await expect(tower).toBeDisabled();
	await expect(tower).toHaveAccessibleDescription(
		"Строить можно только во время волны",
	);
	await dragTo(page, "Стрелковая · 60", "Площадка 1");
	await expect(
		page.getByRole("button", { name: /Стрелковая · уровень 1/ }),
	).toBeHidden();
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	await expect(tower).toHaveAccessibleDescription(
		/Перетащите на свободную площадку/,
	);
	await dragTo(page, "Стрелковая · 60", "Площадка 1");
	await expect(
		page.getByRole("button", { name: /Стрелковая · уровень 1.*площадка 1$/ }),
	).toBeVisible({ timeout: 3000 });
});

test("the third tower waits for a free builder and the HUD shows who is busy", async ({
	page,
}) => {
	await page.goto("/?game=defense&seed=builders-queue");
	await page.getByRole("button", { name: "Плей", exact: true }).click();
	for (const slot of [1, 2, 3])
		await dragTo(page, "Стрелковая · 60", `Площадка ${slot}`);
	await expect(
		page.getByRole("button", {
			name: "Стрелковая · уровень 1 · в очереди · площадка 3",
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Стрелковая · уровень 1 · строится · площадка 1",
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: /^Строитель 1: площадка 1 · \d с$/ }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: /^Строитель 2: площадка 2 · \d с$/ }),
	).toBeVisible();
	await page
		.locator(".defense")
		.screenshot({ path: "test-results/builders-queue.png" });
	await expect(
		page.getByRole("button", { name: "Строитель 2: свободен" }),
	).toBeVisible({ timeout: 15000 });
});
