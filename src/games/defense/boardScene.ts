import { extensionHeight } from "./board";
import { Random } from "@/primitives/random";
import { distanceBetween, type Point } from "@/primitives/spatial";
import { biomeRowEdges, spriteCells, type DefenseAssets } from "./assets";
import { roadFor, sitesFor } from "./board";
import { levelDefinition } from "./definitions/campaign";
import { terrainPalettes, type BiomeId } from "./theme";

import type {
	TerrainLandmark,
	TerrainScene,
	TerrainSegment,
} from "./render/scene";
type Prop = Point & { size: number; cell: number };
type Segment = {
	props: Prop[];
	landmarks: TerrainLandmark[];
	tiles: number[];
};
type Scenery = {
	atlas: keyof Pick<DefenseAssets, "atlas" | "biomes">;
	trees: number[];
	small: number[];
	largeLimit: number;
	smallLimit: number;
};
const scenery: Record<BiomeId, Scenery> = {
	forest: {
		atlas: "atlas",
		trees: [spriteCells.oak, spriteCells.pine],
		small: [spriteCells.bush],
		largeLimit: 24,
		smallLimit: 18,
	},
	autumn: {
		atlas: "biomes",
		trees: [0],
		small: [1],
		largeLimit: 22,
		smallLimit: 18,
	},
	deadwood: {
		atlas: "biomes",
		trees: [2, 3],
		small: [5],
		largeLimit: 18,
		smallLimit: 14,
	},
	drylands: {
		atlas: "biomes",
		trees: [4],
		small: [5],
		largeLimit: 16,
		smallLimit: 14,
	},
	desert: {
		atlas: "biomes",
		trees: [6, 6, 8],
		small: [5, 6, 5, 7],
		largeLimit: 12,
		smallLimit: 14,
	},
	volcano: {
		atlas: "biomes",
		trees: [9, 10],
		small: [11],
		largeLimit: 7,
		smallLimit: 14,
	},
};

const landmarkCells: Record<BiomeId, number> = {
	forest: 1,
	autumn: 3,
	deadwood: 5,
	drylands: 7,
	desert: 9,
	volcano: 11,
};

const textureCells: Record<BiomeId, { ground: number; road: number }> = {
	forest: { ground: 0, road: 1 },
	autumn: { ground: 2, road: 3 },
	deadwood: { ground: 4, road: 5 },
	drylands: { ground: 6, road: 7 },
	desert: { ground: 8, road: 9 },
	volcano: { ground: 10, road: 11 },
};

function distanceToSegment(point: Point, start: Point, end: Point): number {
	const dx = end.x - start.x,
		dy = end.y - start.y,
		lengthSquared = dx * dx + dy * dy;
	if (lengthSquared === 0) return distanceBetween(point, start);
	const fraction = Math.max(
		0,
		Math.min(
			1,
			((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
		),
	);
	return distanceBetween(point, {
		x: start.x + dx * fraction,
		y: start.y + dy * fraction,
	});
}

function distanceToPath(point: Point, path: readonly Point[]): number {
	let closest = Number.POSITIVE_INFINITY;
	for (let index = 0; index < path.length - 1; index++)
		closest = Math.min(
			closest,
			distanceToSegment(point, path[index], path[index + 1]),
		);
	return closest;
}

function nearest(point: Point, points: readonly Point[]): number {
	return points.reduce(
		(distance, candidate) =>
			Math.min(distance, distanceBetween(point, candidate)),
		Number.POSITIVE_INFINITY,
	);
}

function createLandmarks(
	seed: string,
	index: number,
	biome: BiomeId,
	top: number,
	bottom: number,
	path: readonly Point[],
	sites: readonly Point[],
): TerrainLandmark[] {
	const random = new Random(`${seed}:landmarks:${index}`);
	const regionalSites = sites.filter(
		(site) => site.y > top - 70 && site.y < bottom + 70,
	);
	const sideCandidates: (TerrainLandmark & { score: number })[] = [];
	for (const x of [58, 332]) {
		for (let y = top + 145; y <= bottom - 145; y += index === 0 ? 60 : 90) {
			const point = { x, y };
			const roadClearance = distanceToPath(point, path);
			const siteClearance = nearest(point, regionalSites);
			if (roadClearance < 82 || siteClearance < 88 || (index === 0 && y > 390))
				continue;
			sideCandidates.push({
				...point,
				size: 104,
				cell: landmarkCells[biome],
				rotation: 0,
				kind: "side",
				score: roadClearance + siteClearance * 0.35 + random.next() * 12,
			});
		}
	}
	sideCandidates.sort((a, b) => b.score - a.score);
	const side = sideCandidates[0];
	return side ? [side] : [];
}

/** Each region owns its seed and props; unlocking another cannot reshuffle it. */
export class DefenseTerrain {
	private seed = "";
	private segments = new Map<number, Segment>();
	private segment(seed: string, index: number): Segment {
		if (this.seed !== seed) {
			this.seed = seed;
			this.segments.clear();
		}
		const cached = this.segments.get(index);
		if (cached) return cached;
		const random = new Random(`${seed}:terrain:${index}`);
		const top = -index * extensionHeight;
		const bottom = index ? top + extensionHeight : 580;
		const biome = levelDefinition(index + 1).biome;
		const style = scenery[biome];
		const tiles = Array.from(
			{ length: Math.ceil((bottom - top) / 26) * 15 },
			() => random.next(),
		);
		const props: Prop[] = [];
		const area = (bottom - top) / 580;
		let largeCount = 0;
		let smallCount = 0;
		const path = roadFor(index + 2);
		const sites = sitesFor(index + 1);
		const landmarks = createLandmarks(
			seed,
			index,
			biome,
			top,
			bottom,
			path,
			sites,
		);
		for (
			let attempt = 0;
			attempt < (index ? Math.ceil((extensionHeight / 580) * 420) : 420);
			attempt++
		) {
			let x = random.range(12, 378),
				y = random.range(top + 30, bottom - 30);
			// Small plants gather near larger props, with occasional isolated accents.
			if (props.length && attempt % 3 !== 0) {
				const anchor = props[Math.floor(random.range(0, props.length))];
				x = Math.max(12, Math.min(378, anchor.x + random.range(-58, 58)));
				y = Math.max(
					top + 30,
					Math.min(bottom - 30, anchor.y + random.range(-64, 64)),
				);
			}
			const large = x < 60 || x > 330;
			const size = large ? random.range(48, 66) : 24;
			if (
				large
					? largeCount >= style.largeLimit * area
					: smallCount >= style.smallLimit * area
			)
				continue;
			if (Math.abs(x - 195) < 55 && y < top + 100) continue;
			if (
				path.some((p, i) => {
					const next = path[i + 1] ?? p;
					return (
						x > Math.min(p.x, next.x) - 35 &&
						x < Math.max(p.x, next.x) + 35 &&
						y > Math.min(p.y, next.y) - 35 &&
						y < Math.max(p.y, next.y) + 35
					);
				})
			)
				continue;
			if (sites.some((p) => Math.abs(p.x - x) < 38 && Math.abs(p.y - y) < 40))
				continue;
			if (index === 0 && y > 430) continue;
			if (
				props.some((p) => distanceBetween(p, { x, y }) < (p.size + size) * 0.43)
			)
				continue;
			if (
				landmarks.some(
					(landmark) =>
						distanceBetween(landmark, { x, y }) < (landmark.size + size) * 0.54,
				)
			)
				continue;
			const cells = large ? style.trees : style.small;
			props.push({ x, y, size, cell: cells[attempt % cells.length] });
			if (large) largeCount++;
			else smallCount++;
		}
		props.sort((a, b) => a.y + a.size / 2 - b.y - b.size / 2);
		const segment = { props, landmarks, tiles };
		this.segments.set(index, segment);
		return segment;
	}

	prepare(seed: string, level: number, assets: DefenseAssets): TerrainScene {
		const segments: TerrainSegment[] = [];
		for (let index = 0; index < level; index++) {
			const biome = levelDefinition(index + 1).biome,
				source = scenery[biome].atlas;
			segments.push({
				...this.segment(seed, index),
				top: -index * extensionHeight,
				height: index ? extensionHeight : 580,
				palette: terrainPalettes[biome],
				previous: index ? terrainPalettes[levelDefinition(index).biome] : null,
				atlas: assets[source],
				rowEdges: source === "atlas" ? [0, 0.25, 0.5, 0.75, 1] : biomeRowEdges,
				landmarkAtlas: assets.landmarks,
				groundTexture: assets.terrainTextures[textureCells[biome].ground],
				roadTexture: assets.terrainTextures[textureCells[biome].road],
			});
		}
		return { path: roadFor(level), segments, cityPaving: assets.cityPaving };
	}
}
