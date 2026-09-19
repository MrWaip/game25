import { expect, test } from "vite-plus/test";
import { DefenseTerrain } from "./boardScene";
import { extensionHeight, sitesFor } from "./board";
import type { DefenseAssets } from "./assets";
import type { Point } from "@/primitives/spatial";

function distanceToSegment(point: Point, start: Point, end: Point): number {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const lengthSquared = dx * dx + dy * dy;
	const fraction =
		lengthSquared === 0
			? 0
			: Math.max(
					0,
					Math.min(
						1,
						((point.x - start.x) * dx + (point.y - start.y) * dy) /
							lengthSquared,
					),
				);
	return Math.hypot(
		point.x - start.x - dx * fraction,
		point.y - start.y - dy * fraction,
	);
}

function distanceToPath(point: Point, path: readonly Point[]): number {
	return Math.min(
		...path
			.slice(0, -1)
			.map((start, index) => distanceToSegment(point, start, path[index + 1])),
	);
}

const assets = {
	atlas: {} as HTMLImageElement,
	biomes: {} as HTMLImageElement,
	landmarks: {} as HTMLImageElement,
	cityPaving: {} as HTMLImageElement,
	terrainTextures: Array.from({ length: 12 }, () => ({}) as HTMLImageElement),
} as unknown as DefenseAssets;

test("every biome keeps its landmark away from the road and board", () => {
	const scene = new DefenseTerrain().prepare("landmark-layout", 6, assets);
	expect(scene.segments).toHaveLength(6);
	for (const [index, segment] of scene.segments.entries()) {
		expect(segment.landmarks, `segment ${index}`).toHaveLength(1);
		const [side] = segment.landmarks;
		expect(side.kind).toBe("side");
		expect(distanceToPath(side, scene.path)).toBeGreaterThanOrEqual(82);
		const top = -index * extensionHeight;
		const bottom = index ? top + extensionHeight : 580;
		if (index === 0) {
			expect(side.y).toBeLessThanOrEqual(390);
			expect(
				Math.max(...segment.props.map((prop) => prop.y)),
			).toBeLessThanOrEqual(430);
		}
		for (const landmark of segment.landmarks) {
			expect(landmark.x - landmark.size / 2).toBeGreaterThanOrEqual(0);
			expect(landmark.x + landmark.size / 2).toBeLessThanOrEqual(390);
			expect(landmark.y - landmark.size / 2).toBeGreaterThan(top);
			expect(landmark.y + landmark.size / 2).toBeLessThan(bottom);
		}
		const regionalSites = sitesFor(index + 1).filter(
			(site) => site.y > top - 70 && site.y < bottom + 70,
		);
		for (const landmark of segment.landmarks)
			expect(
				Math.min(
					...regionalSites.map((site) =>
						Math.hypot(site.x - landmark.x, site.y - landmark.y),
					),
				),
			).toBeGreaterThanOrEqual(88);
		for (const prop of segment.props)
			for (const landmark of segment.landmarks)
				expect(
					Math.hypot(prop.x - landmark.x, prop.y - landmark.y),
				).toBeGreaterThanOrEqual((landmark.size + prop.size) * 0.54);
	}
});

test("the same seed preserves every landmark when the campaign expands", () => {
	const terrain = new DefenseTerrain();
	const before = terrain.prepare("stable-landmarks", 2, assets).segments;
	const after = terrain.prepare("stable-landmarks", 6, assets).segments;
	expect(after.slice(0, 2).map((segment) => segment.landmarks)).toEqual(
		before.map((segment) => segment.landmarks),
	);
});
