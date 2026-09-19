import { offsetFromSegment, type Point } from "@/primitives/spatial";
import { Polyline } from "@/primitives/polyline";
export type { Point } from "@/primitives/spatial";
export const boardWidth = 390;
export const boardHeight = 580;
export const extensionHeight = boardHeight * 2;
const extensionScale = extensionHeight / boardHeight;
const entranceInset = 76;
export const road: Point[] = [
	{ x: 195, y: entranceInset },
	{ x: 195, y: 85 },
	{ x: 305, y: 85 },
	{ x: 305, y: 190 },
	{ x: 95, y: 190 },
	{ x: 95, y: 300 },
	{ x: 285, y: 300 },
	{ x: 285, y: 410 },
	{ x: 195, y: 410 },
	// The road continues under the base sprite and reaches the bank door.
	{ x: 195, y: 545 },
];
export const castleWall: Point = { x: 195, y: 440 };
type SiteAnchor = { segment: number; fraction: number; offset: number };
// Offsets are world distances, not scaled with the region height.
const siteAnchors: SiteAnchor[] = [
	{ segment: 2, fraction: 55 / 105, offset: 60 },
	{ segment: 4, fraction: 50 / 110, offset: -50 },
	{ segment: 6, fraction: 50 / 110, offset: 50 },
	{ segment: 7, fraction: -15 / 90, offset: -35 },
	{ segment: 3, fraction: 1, offset: 55 },
	{ segment: 6, fraction: 0.25, offset: -50 },
	{ segment: 3, fraction: 130 / 210, offset: 55 },
	{ segment: 3, fraction: 70 / 210, offset: -50 },
	{ segment: 5, fraction: 50 / 190, offset: 50 },
	{ segment: 6, fraction: 90 / 110, offset: -50 },
];
// Two pockets around the left and right turns. Offsets stay compact on tall maps.
// The first six entries retain the regional ownership order of legacy saves.
const extensionSites: readonly Point[] = [
	{ x: 150, y: 440 },
	{ x: 235, y: 765 },
	{ x: 225, y: 325 },
	{ x: 135, y: 825 },
	{ x: 85, y: 325 },
	{ x: 335, y: 765 },
	{ x: 40, y: 390 },
	{ x: 155, y: 325 },
	{ x: 225, y: 435 },
	{ x: 335, y: 825 },
	{ x: 245, y: 875 },
	{ x: 175, y: 765 },
];
export const sitesPerExtension = extensionSites.length;
function regionRoad(segment: number): Point[] {
	const scale = segment === 0 ? 1 : extensionScale;
	return road.map((point) => ({
		x: point.x,
		y: -segment * extensionHeight + point.y * scale,
	}));
}
function placeSites(
	path: readonly Point[],
	anchors: readonly SiteAnchor[],
): Point[] {
	return anchors.map((anchor) =>
		offsetFromSegment(
			path[anchor.segment],
			path[anchor.segment + 1],
			anchor.fraction,
			anchor.offset,
		),
	);
}
export const sites = placeSites(road, siteAnchors);
const paths = new Map<number, Polyline>();
function pathFor(level: number): Polyline {
	let path = paths.get(level);
	if (!path) {
		path = new Polyline(createRoad(level));
		paths.set(level, path);
	}
	return path;
}
export function pointOnRoad(distance: number, level = 1): Point {
	return pathFor(level).pointAt(distance);
}
export function roadFor(level: number): readonly Point[] {
	return pathFor(level).points;
}
function createRoad(level: number): Point[] {
	const extension: Point[] = [];
	for (let segment = level - 1; segment > 0; segment--) {
		extension.push(...regionRoad(segment));
	}

	return [...extension, ...road.slice(0, -1), castleWall];
}
const siteLayouts = new Map<number, readonly Point[]>([[1, sites]]);
export function sitesFor(level: number): readonly Point[] {
	const cached = siteLayouts.get(level);
	if (cached) return cached;
	const result = [...sites];
	for (let segment = 1; segment < level; segment++) {
		result.push(
			...extensionSites.map((site) => ({
				x: site.x,
				y: site.y - segment * extensionHeight,
			})),
		);
	}

	siteLayouts.set(level, result);
	return result;
}
export function pathLengthFor(level: number): number {
	return pathFor(level).length;
}
