import { aliases } from "./aliases.ts";
import { defineConfig } from "vite-plus";

export default defineConfig({
	resolve: { alias: aliases },
	base: process.env.BASE_PATH || "/",
	server: { port: 3000, host: true },
	preview: { port: 3000, host: true },
	lint: {
		plugins: ["eslint", "typescript"],
		categories: { correctness: "error" },
		env: { browser: true },
		ignorePatterns: ["dist/**", "node_modules/**"],
		options: { typeAware: true, typeCheck: true },
		jsPlugins: ["./tooling/importBoundaries.ts"],
		rules: {
			"architecture/import-boundaries": "error",
			"typescript/no-explicit-any": "error",
			// Preserve the existing lint policy while enabling the TS7 type checker.
			"typescript/no-misused-spread": "off",
			"typescript/unbound-method": "off",
			"typescript/no-floating-promises": "off",
		},
	},
	fmt: {
		printWidth: 80,
		useTabs: true,
		singleQuote: false,
		semi: true,
		ignorePatterns: ["dist/**", "package-lock.json"],
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "happy-dom",
					include: ["src/**/*.test.ts"],
					exclude: ["src/**/stress.test.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "stress",
					environment: "happy-dom",
					include: ["src/games/jumper/testkit/stress.test.ts"],
					testTimeout: 15000,
				},
			},
		],
	},
	pack: {
		alias: aliases,
		tsconfig: "tsconfig.lib.json",
		entry: {
			index: "./src/export/index.ts",
			defense: "./src/games/defense/browser.ts",
			arcade: "./src/launcher/index.ts",
		},
		target: false,
		format: "esm",
		outExtensions: () => ({
			js: ".js",
			dts: ".d.ts",
		}),
		deps: { alwaysBundle: ["gl-matrix", "@timohausmann/quadtree-ts"] },
		loader: {
			".png": "dataurl",
			".wav": "dataurl",
			".mp3": "dataurl",
		},
	},
});
