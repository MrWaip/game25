import type { TerrainPalette } from "../theme";
export type TerrainLandmark = {
	x: number;
	y: number;
	size: number;
	cell: number;
	rotation: number;
	kind: "crossing" | "side";
};
export type TerrainSegment = {
	top: number;
	height: number;
	palette: TerrainPalette;
	previous: TerrainPalette | null;
	atlas: HTMLImageElement;
	rowEdges: readonly number[];
	landmarkAtlas: HTMLImageElement;
	landmarks: TerrainLandmark[];
	groundTexture: HTMLImageElement;
	roadTexture: HTMLImageElement;
	props: { x: number; y: number; size: number; cell: number }[];
	tiles: number[];
};
export type TerrainScene = {
	path: readonly { x: number; y: number }[];
	segments: TerrainSegment[];
	cityPaving: HTMLImageElement;
};
