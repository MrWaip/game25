// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, expect, it } from "vite-plus/test";
import { importBoundaries } from "../../tooling/importBoundaries";

const root = process.cwd();

describe("game isolation", () => {
	it.each(["jumper", "defense"])(
		"typechecks shared modules and remaining game without %s",
		(removed) => {
			const directory = mkdtempSync(path.join(tmpdir(), "game25-isolation-"));
			try {
				cpSync(path.join(root, "src"), path.join(directory, "src"), {
					recursive: true,
					filter: (file) =>
						path.relative(root, file) !== path.join("src", "games", removed),
				});
				symlinkSync(
					path.join(root, "node_modules"),
					path.join(directory, "node_modules"),
					"dir",
				);
				cpSync(
					path.join(root, "tsconfig.json"),
					path.join(directory, "tsconfig.base.json"),
				);
				writeFileSync(
					path.join(directory, "tsconfig.json"),
					JSON.stringify({
						extends: "./tsconfig.base.json",
						exclude: [
							"src/**/*.test.ts",
							"src/main.ts",
							"src/launcher",
							"src/export",
						],
					}),
				);
				const result = spawnSync(
					process.execPath,
					[
						path.join(root, "node_modules/typescript/bin/tsc"),
						"--noEmit",
						"--project",
						path.join(directory, "tsconfig.json"),
					],
					{ encoding: "utf8", timeout: 15000 },
				);
				expect(result.error).toBeUndefined();
				expect(result.stdout + result.stderr).toBe("");
				expect(result.status).toBe(0);
			} finally {
				rmSync(directory, { recursive: true, force: true });
			}
		},
		20000,
	);
});

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester();
const sample = (file: string, code: string) => ({
	filename: path.join(root, "src", file),
	code,
});
tester.run("import-boundaries", importBoundaries, {
	valid: [
		sample("games/defense/example.ts", 'import "@/core/world";'),
		sample("launcher/example.ts", 'void import("@/games/jumper");'),
		sample("games/defense/theme.ts", 'import "@/ui/colors";'),
	],
	invalid: [
		...[
			'import type { Enemy } from "@/games/defense/components/enemyComponent";',
			'export * from "../games/defense/session";',
			'export { createDefenseSession } from "../games/defense/session";',
			'void import("@/games/jumper");',
			'import "@/core/../games/jumper/world";',
			'type Session = import("@/games/defense/session").DefenseSession;',
		].map((code) => ({
			...sample("core/example.ts", code),
			errors: [{ messageId: "ownership" }],
		})),
		{
			...sample("games/defense/example.ts", 'import "../jumper/world";'),
			errors: [{ messageId: "ownership" }],
		},
		{
			...sample("games/jumper/example.ts", 'import "@/launcher";'),
			errors: [{ messageId: "ownership" }],
		},
		{
			...sample("games/defense/example.ts", 'import "@/ui/colors";'),
			errors: [{ messageId: "palette" }],
		},
	],
});
