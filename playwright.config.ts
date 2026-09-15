import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: "./e2e",
	use: {
		...devices["Pixel 7"],
		baseURL,
		channel: process.env.PLAYWRIGHT_CHANNEL,
	},
	webServer: {
		command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
	},
});
