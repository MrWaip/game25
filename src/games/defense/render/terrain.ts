import type { PaintContext } from "@/render/surface";
import { theme } from "../theme";
import type { TerrainScene } from "./scene";

function paintCityInterior(ctx: PaintContext, paving: HTMLImageElement): void {
	const pattern = ctx.createPattern(paving, "repeat");
	ctx.save();
	ctx.fillStyle = theme.cityPaving;
	ctx.fillRect(0, 493, 390, 87);
	if (pattern) {
		ctx.globalAlpha = 0.52;
		ctx.fillStyle = pattern;
		ctx.fillRect(0, 493, 390, 87);
	}
	ctx.globalAlpha = 1;
	ctx.fillStyle = theme.cityAvenue;
	ctx.fillRect(158, 493, 74, 87);
	if (pattern) {
		ctx.globalAlpha = 0.68;
		ctx.fillStyle = pattern;
		ctx.fillRect(158, 493, 74, 87);
	}
	ctx.globalAlpha = 1;
	ctx.strokeStyle = theme.cityCurb;
	ctx.lineWidth = 1.5;
	for (const x of [158, 232]) {
		ctx.beginPath();
		ctx.moveTo(x, 493);
		ctx.lineTo(x, 580);
		ctx.stroke();
	}
	ctx.restore();
}

export function paintTerrain(ctx: PaintContext, scene: TerrainScene): void {
	const { path } = scene;
	for (const segment of scene.segments) {
		const { palette, top, height } = segment;
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, top, 390, height);
		ctx.clip();
		ctx.fillStyle = palette.ground;
		ctx.fillRect(0, top, 390, height);
		const groundTexture = ctx.createPattern(segment.groundTexture, "repeat");
		if (groundTexture) {
			ctx.globalAlpha = 0.16;
			ctx.fillStyle = groundTexture;
			ctx.fillRect(0, top, 390, height);
		}
		ctx.globalAlpha = 1;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		for (const stroke of [
			{ color: palette.edge, width: 43 },
			{ color: palette.road, width: 37 },
		]) {
			ctx.strokeStyle = stroke.color;
			ctx.lineWidth = stroke.width;
			ctx.beginPath();
			path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
			ctx.stroke();
		}
		const roadTexture = ctx.createPattern(segment.roadTexture, "repeat");
		if (roadTexture) {
			ctx.globalAlpha = 0.22;
			ctx.strokeStyle = roadTexture;
			ctx.lineWidth = 34;
			ctx.beginPath();
			path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
		if (segment.previous) {
			const blend = ctx.createLinearGradient(
				0,
				top + height - 24,
				0,
				top + height,
			);
			blend.addColorStop(0, palette.ground);
			blend.addColorStop(1, segment.previous.ground);
			ctx.fillStyle = blend;
			ctx.fillRect(0, top + height - 24, 390, 24);
			for (const stroke of [
				{ color: palette.edge, next: segment.previous.edge, width: 43 },
				{ color: palette.road, next: segment.previous.road, width: 37 },
			]) {
				const roadBlend = ctx.createLinearGradient(
					0,
					top + height - 24,
					0,
					top + height,
				);
				roadBlend.addColorStop(0, stroke.color);
				roadBlend.addColorStop(1, stroke.next);
				ctx.save();
				ctx.beginPath();
				ctx.rect(0, top + height - 24, 390, 24);
				ctx.clip();
				ctx.strokeStyle = roadBlend;
				ctx.lineWidth = stroke.width;
				ctx.beginPath();
				path.forEach((p, i) =>
					i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
				);
				ctx.stroke();
				ctx.restore();
			}
		}
		if (top === 0) paintCityInterior(ctx, scene.cityPaving);
		const landmarkWidth = segment.landmarkAtlas.naturalWidth / 4;
		const landmarkHeight = segment.landmarkAtlas.naturalHeight / 3;
		for (const landmark of segment.landmarks) {
			const scale = landmark.size / Math.max(landmarkWidth, landmarkHeight);
			ctx.save();
			ctx.translate(landmark.x, landmark.y);
			ctx.rotate(landmark.rotation);
			ctx.drawImage(
				segment.landmarkAtlas,
				(landmark.cell % 4) * landmarkWidth,
				Math.floor(landmark.cell / 4) * landmarkHeight,
				landmarkWidth,
				landmarkHeight,
				-(landmarkWidth * scale) / 2,
				-(landmarkHeight * scale) / 2,
				landmarkWidth * scale,
				landmarkHeight * scale,
			);
			ctx.restore();
		}
		const { atlas, rowEdges } = segment;
		const width = atlas.naturalWidth / 4;
		for (const p of segment.props) {
			const row = Math.floor(p.cell / 4);
			const sourceY = rowEdges[row] * atlas.naturalHeight;
			const height = (rowEdges[row + 1] - rowEdges[row]) * atlas.naturalHeight;
			const scale = p.size / Math.max(width, height);
			ctx.drawImage(
				atlas,
				(p.cell % 4) * width,
				sourceY,
				width,
				height,
				p.x - (width * scale) / 2,
				p.y - (height * scale) / 2,
				width * scale,
				height * scale,
			);
		}

		ctx.restore();
	}
}
