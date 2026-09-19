import type { CanvasElement } from "@/render/canvas";
import { CanvasSurface, type PaintContext } from "@/render/surface";
import {
	worldPoint,
	positive,
	type WorldPoint,
	type ScreenPoint,
	type Projection,
} from "@/render/projection";
import type { AssetsManager } from "@/core/assetsManager";
import type { Screen } from "@/core/screen";
import { AABB } from "@/primitives/aabb";
import { Vec2 } from "@/primitives/vec2-gl";

export interface IRenderer {
	frame(camera: Camera, paint: (frame: FrameRenderer) => undefined): void;
}

export interface FrameRenderer {
	readonly bounds: AABB;

	renderAnimated(sprite: RenderAnimated): void;

	renderPrimitive(render: RenderPrimitive): void;

	debugAABB(aabb: AABB, color: string, name: string | undefined): void;

	renderSprite(sprite: RenderSprite): void;

	renderText(text: RenderText): void;
}

type Camera = {
	zoom: number;
	position: Vec2;
};

type RenderText = {
	text: string[][];
	position: WorldPoint | ScreenPoint;
	fontSize: number;
	color: string;
};

type RenderAnimated = {
	name: string;
	frame: number;
	direction: "right" | "left";
	position: WorldPoint;
	size: Vec2;
	spriteSize: Vec2;
	cols?: number;
};

type RenderPrimitive = {
	color: string;
	form: "rect";
	position: WorldPoint;
	size: Vec2;
	filled: boolean;
};

export type SpriteSizing = "stretch" | "repeat" | "repeat-x";

type RenderSprite = {
	alpha: number;
	imageName: string;
	position: WorldPoint | ScreenPoint;
	size: Vec2;
	spriteSize: Vec2;
	spriteOffset: Vec2;
	sizing: SpriteSizing;
};

export class CanvasRenderer implements IRenderer {
	#surface: CanvasSurface;
	constructor(
		canvas: CanvasElement,
		private readonly assetsManager: Pick<AssetsManager, "getImage">,
		private readonly screen: Screen,
	) {
		this.#surface = new CanvasSurface(canvas);
		canvas.style.width = `${screen.size[0]}px`;
		canvas.style.height = `${screen.size[1]}px`;
	}
	frame(camera: Camera, paint: (frame: FrameRenderer) => undefined): void {
		const projection = this.screen.projection(camera.position, camera.zoom);
		this.#surface.resize(projection.viewport, this.screen.pixelRatio);
		this.#surface.frame((ctx) => {
			const frame = new CanvasFrame(ctx, this.assetsManager, projection);
			try {
				paint(frame);
			} finally {
				frame.close();
			}
		});
	}
}

class CanvasFrame implements FrameRenderer {
	readonly bounds: AABB;
	#open = true;
	private get ctx(): PaintContext {
		if (!this.#open) throw new Error("Frame is closed");
		return this.context;
	}
	close(): void {
		this.#open = false;
	}
	constructor(
		private readonly context: PaintContext,
		private readonly assetsManager: Pick<AssetsManager, "getImage">,
		private readonly projection: Projection,
	) {
		const { x, y, width, height } = projection.bounds;
		this.bounds = AABB.fromCenter(
			Vec2.fromValues(x + width / 2, y + height / 2),
			Vec2.fromValues(width, height),
		);
	}

	renderAnimated(sprite: RenderAnimated): void {
		const screenCenter = this.worldToCanvas(sprite.position);
		const scaledSize = Vec2.create();
		Vec2.scale(scaledSize, sprite.size, this.projection.scaleX);
		const halfSize = Vec2.create();
		Vec2.scale(halfSize, scaledSize, 0.5);
		const topLeft = Vec2.create();
		Vec2.sub(topLeft, screenCenter, halfSize);

		const cols = sprite.cols;
		let frameOffsetX: number;
		let frameOffsetY: number;

		if (cols !== undefined) {
			const col = sprite.frame % cols;
			const row = Math.floor(sprite.frame / cols);
			frameOffsetX = sprite.spriteSize[0] * col;
			frameOffsetY = sprite.spriteSize[1] * row;
		} else {
			frameOffsetX = sprite.spriteSize[0] * sprite.frame;
			frameOffsetY = 0;
		}

		const image = this.assetsManager.getImage(sprite.name);

		this.ctx.save();

		if (sprite.direction === "left") {
			this.ctx.scale(-1, 1);

			this.ctx.drawImage(
				image,
				frameOffsetX,
				frameOffsetY,
				sprite.spriteSize[0],
				sprite.spriteSize[1],
				-topLeft[0] - scaledSize[0],
				topLeft[1],
				scaledSize[0],
				scaledSize[1],
			);
		} else {
			this.ctx.drawImage(
				image,
				frameOffsetX,
				frameOffsetY,
				sprite.spriteSize[0],
				sprite.spriteSize[1],
				topLeft[0],
				topLeft[1],
				scaledSize[0],
				scaledSize[1],
			);
		}

		this.ctx.restore();
	}

	renderSprite(sprite: RenderSprite) {
		positive(sprite.spriteSize[0], "sprite source width");
		positive(sprite.spriteSize[1], "sprite source height");
		positive(sprite.size[0], "sprite width");
		positive(sprite.size[1], "sprite height");
		const image = this.assetsManager.getImage(sprite.imageName);

		this.ctx.save();

		this.ctx.globalAlpha = sprite.alpha;

		let screenCenter: Vec2;
		let scaledSize: Vec2;
		let scaledTile: Vec2;

		if (sprite.position.space === "screen") {
			screenCenter = Vec2.fromValues(sprite.position.x, sprite.position.y);
			scaledSize = sprite.size;
			scaledTile = sprite.spriteSize;
		} else {
			screenCenter = this.worldToCanvas(sprite.position);
			scaledSize = Vec2.create();
			Vec2.scale(scaledSize, sprite.size, this.projection.scaleX);
			scaledTile = Vec2.create();
			Vec2.scale(scaledTile, sprite.spriteSize, this.projection.scaleX);
		}

		const halfSize = Vec2.create();
		Vec2.scale(halfSize, scaledSize, 0.5);
		const topLeft = Vec2.create();
		Vec2.sub(topLeft, screenCenter, halfSize);

		if (sprite.sizing === "stretch") {
			this.ctx.drawImage(
				image,
				sprite.spriteOffset[0],
				sprite.spriteOffset[1],
				sprite.spriteSize[0],
				sprite.spriteSize[1],
				topLeft[0],
				topLeft[1],
				scaledSize[0],
				scaledSize[1],
			);

			this.ctx.restore();
			return;
		}

		if (sprite.sizing === "repeat-x") {
			const tileWidth =
				sprite.position.space === "screen"
					? sprite.spriteSize[0]
					: scaledTile[0];
			const cols = Math.ceil(scaledSize[0] / tileWidth);
			const stretchedHeight = scaledSize[1];

			for (let x = 0; x < cols; x++) {
				const dstX = topLeft[0] + x * tileWidth;
				const remainingW = scaledSize[0] - x * tileWidth;
				if (remainingW <= 0) break;
				const drawW = Math.min(tileWidth, remainingW);

				const sourceW =
					sprite.position.space === "screen"
						? drawW
						: drawW / this.projection.scaleX;

				this.ctx.drawImage(
					image,
					sprite.spriteOffset[0],
					sprite.spriteOffset[1],
					sourceW,
					sprite.spriteSize[1],
					dstX,
					topLeft[1],
					drawW,
					stretchedHeight,
				);
			}

			this.ctx.restore();
			return;
		}

		const cols = Math.ceil(scaledSize[0] / scaledTile[0]);
		const rows = Math.ceil(scaledSize[1] / scaledTile[1]);

		for (let y = 0; y < rows; y++) {
			const dstY = topLeft[1] + y * scaledTile[1];
			const remainingH = scaledSize[1] - y * scaledTile[1];
			if (remainingH <= 0) break;
			const drawH = Math.min(scaledTile[1], remainingH);

			for (let x = 0; x < cols; x++) {
				const dstX = topLeft[0] + x * scaledTile[0];
				const remainingW = scaledSize[0] - x * scaledTile[0];
				if (remainingW <= 0) break;
				const drawW = Math.min(scaledTile[0], remainingW);

				const sourceW =
					sprite.position.space === "screen"
						? drawW
						: drawW / this.projection.scaleX;
				const sourceH =
					sprite.position.space === "screen"
						? drawH
						: drawH / this.projection.scaleX;

				this.ctx.drawImage(
					image,
					sprite.spriteOffset[0],
					sprite.spriteOffset[1],
					sourceW,
					sourceH,
					dstX,
					dstY,
					drawW,
					drawH,
				);
			}
		}

		this.ctx.restore();
	}

	renderText(text: RenderText): void {
		const ctx = this.ctx;
		ctx.save();

		const fontSize = text.fontSize;
		const color = text.color ?? "white";
		const scaledFontSize = fontSize;
		const lineHeight = scaledFontSize * 1.2;
		const columnSpacing = 12;
		const centerCols = true;

		ctx.font = `bold ${scaledFontSize}px Inter, system-ui, sans-serif`;
		ctx.fillStyle = color;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";

		const screenPos =
			text.position.space === "screen"
				? Vec2.fromValues(text.position.x, text.position.y)
				: this.worldToCanvas(text.position);

		const rows = text.text;

		const colCount = Math.max(...rows.map((r) => r.length));
		const colWidths = new Array(colCount).fill(0);
		const cellWidths: number[][] = [];

		for (let row = 0; row < rows.length; row++) {
			const rowWidths: number[] = [];
			for (let col = 0; col < rows[row].length; col++) {
				const cell = rows[row][col];
				const w = ctx.measureText(cell).width;
				rowWidths.push(w);
				if (w > colWidths[col]) colWidths[col] = w;
			}
			cellWidths.push(rowWidths);
		}

		for (let row = 0; row < rows.length; row++) {
			const y = screenPos[1] + row * lineHeight;
			const cells = rows[row];

			let x = screenPos[0];
			for (let col = 0; col < cells.length; col++) {
				const cell = cells[col];
				const colWidth = colWidths[col];
				const cellWidth = cellWidths[row][col];

				if (centerCols) {
					const centeredX = x + (colWidth - cellWidth) / 2;
					ctx.fillText(cell, centeredX, y);
				} else {
					ctx.fillText(cell, x, y);
				}

				x += colWidth + columnSpacing;
			}
		}
		ctx.restore();
	}

	debugAABB(aabb: AABB, color: string, name: string | undefined): void {
		this.ctx.save();
		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = 2;

		const topLeft = this.worldToCanvas(worldPoint(aabb.min[0], aabb.max[1]));
		const bottomRight = this.worldToCanvas(
			worldPoint(aabb.max[0], aabb.min[1]),
		);

		const width = bottomRight[0] - topLeft[0];
		const height = bottomRight[1] - topLeft[1];

		this.ctx.strokeRect(topLeft[0], topLeft[1], width, height);

		if (name) {
			this.renderText({
				color,
				fontSize: 10,
				position: worldPoint(aabb.min[0], aabb.max[1]),
				text: [[name]],
			});
		}

		this.ctx.restore();
	}

	private worldToCanvas(world: WorldPoint): Vec2 {
		const point = this.projection.toScreen(world);
		return Vec2.fromValues(point.x, point.y);
	}

	renderPrimitive(render: RenderPrimitive): void {
		this.ctx.save();

		this.ctx.fillStyle = render.color;
		this.ctx.strokeStyle = render.color;
		this.ctx.lineWidth = 2;

		const screenCenter = this.worldToCanvas(render.position);
		const scaledSize = Vec2.create();
		Vec2.scale(scaledSize, render.size, this.projection.scaleX);

		const halfSize = Vec2.create();
		Vec2.scale(halfSize, scaledSize, 0.5);
		const topLeft = Vec2.create();
		Vec2.sub(topLeft, screenCenter, halfSize);

		switch (render.form) {
			case "rect":
				if (render.filled) {
					this.ctx.fillRect(
						topLeft[0],
						topLeft[1],
						scaledSize[0],
						scaledSize[1],
					);
				} else {
					this.ctx.strokeRect(
						topLeft[0],
						topLeft[1],
						scaledSize[0],
						scaledSize[1],
					);
				}
				break;
		}

		this.ctx.restore();
	}
}
