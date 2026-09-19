import { expect, test } from "vite-plus/test";
import { distanceBetween } from "@/primitives/spatial";
import { extensionHeight, sitesFor, boardWidth } from "./board";
import { createDefenseSession } from "./session";

test("each defensive pocket lets at least four short-range towers share a road section", () => {
	const initial = sitesFor(1);
	expect(initial).toHaveLength(10);
	for (const point of [
		{ x: 190, y: 190 },
		{ x: 250, y: 410 },
	]) {
		expect(
			initial.filter((site) => distanceBetween(site, point) <= 120).length,
		).toBeGreaterThanOrEqual(4);
	}
	for (let level = 2; level <= 6; level++) {
		const previous = sitesFor(level - 1);
		const current = sitesFor(level);
		expect(current.slice(0, previous.length)).toEqual(previous);
		const added = current.slice(previous.length);
		expect(added).toHaveLength(12);
		for (const point of [
			{ x: 165, y: 380 },
			{ x: 245, y: 820 },
		]) {
			const center = { x: point.x, y: point.y - (level - 1) * extensionHeight };
			expect(
				added.filter((site) => distanceBetween(site, center) <= 120).length,
			).toBeGreaterThanOrEqual(5);
		}
	}
});

test("clustered sites leave room for tower sprites and separate touch targets", () => {
	const sites = sitesFor(6);
	for (const [index, site] of sites.entries()) {
		expect(site.x).toBeGreaterThanOrEqual(34);
		expect(site.x).toBeLessThanOrEqual(boardWidth - 34);
		for (const other of sites.slice(index + 1))
			expect(distanceBetween(site, other)).toBeGreaterThanOrEqual(60);
	}
});

test.each(["gdd-2", "gdd-3"])(
	"%s preserves all legacy towers in their regions and migrates only once",
	async (version) => {
		const initial = await createDefenseSession({ seed: "cluster-migration" });
		const state = initial.snapshot();
		await initial.destroy();
		state.level = 6;
		state.wave = 16;
		state.phase = "wave";
		state.towers = Array.from({ length: 36 }, (_, slot) => ({
			slot,
			kind: "arrow",
			level: 2,
			specialization: null,
			cooldown: 0.5,
			construction: 0,
			constructionKind: null,
			shots: 0,
			rate: 1,
			rushed: 0,
			order: 0,
		}));
		const session = await createDefenseSession({
			saved: JSON.stringify({ version, run: state }),
		});
		try {
			const updated = session.snapshot();
			expect(updated.towers).toHaveLength(36);
			for (const [index, tower] of updated.towers.entries()) {
				const region = Math.floor(index / 6);
				expect(tower.slot).toBe(
					region === 0 ? index : 10 + (region - 1) * 12 + (index % 6),
				);
				expect(tower.level).toBe(2);
				expect(tower.cooldown).toBe(0.5);
			}
			const resumed = await createDefenseSession({ saved: session.save() });
			try {
				expect(resumed.snapshot()).toEqual(updated);
			} finally {
				await resumed.destroy();
			}
		} finally {
			await session.destroy();
		}
	},
);
