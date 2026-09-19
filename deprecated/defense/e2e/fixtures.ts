import { test as base, expect } from "@playwright/test";

/** Capture ErrorEvents before Vite can consume them, including across reloads. */
export const test = base.extend<{ browserErrors: void }>({
	browserErrors: [
		async ({ page }, use) => {
			const errors = new Set<string>();
			await page.exposeFunction("reportBrowserError", (message: string) => {
				errors.add(message);
			});
			await page.addInitScript(() => {
				window.addEventListener("error", (event) => {
					void (
						window as unknown as {
							reportBrowserError(message: string): Promise<void>;
						}
					).reportBrowserError(event.message);
				});
			});
			page.on("pageerror", (error) => errors.add(error.message));
			await use();
			expect([...errors], "Unhandled browser errors").toEqual([]);
		},
		{ auto: true },
	],
});
export { expect };
