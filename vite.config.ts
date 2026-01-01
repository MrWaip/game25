import { defineConfig } from "vite";

export default defineConfig({
	base: process.env.BASE_PATH || "/",
	build: {
		minify: true,
	},
	server: {
		port: 3000,
		host: true,
	},
	preview: {
		port: 3000,
		host: true,
	},
});
