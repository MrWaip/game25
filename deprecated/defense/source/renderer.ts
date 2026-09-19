import type { CanvasElement } from "@/render/canvas";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { BoardPreview } from "@/games/defense/interaction/model";
import { prepareBoardScene } from "@/games/defense/boardScene";
import { paintBoard } from "@/games/defense/render/paint";
import type { BoardScene } from "@/games/defense/render/scene";
import { CanvasSurface } from "@/render/surface";
import { Projection, clientPoint } from "@/render/projection";

/** One projection owns both the painted board and pointer-to-cell conversion. */
export class DefenseRenderer {
	#surface: CanvasSurface;
	#projection: Projection | undefined;
	#grid: BoardScene["grid"] | undefined;
	constructor(private readonly canvas: CanvasElement) {
		this.#surface = new CanvasSurface(canvas);
	}
	draw(state: DefenseSnapshot, view: BoardPreview): void {
		const scene = prepareBoardScene(state, view);
		const { grid } = scene;
		const width = this.canvas.clientWidth || grid.width;
		const viewport = { width, height: (width * grid.height) / grid.width };
		const projection = new Projection(
			viewport,
			{ x: 0, y: 0, width: grid.width, height: grid.height },
			"down",
		);
		this.#grid = grid;
		this.#projection = projection;
		this.#surface.resize(viewport, Math.min(window.devicePixelRatio || 1, 3));
		this.#surface.frame((ctx) => {
			ctx.scale(projection.scaleX, projection.scaleY);
			paintBoard(ctx, scene);
		});
	}
	cellAt(clientX: number, clientY: number): number {
		const point = this.#surface.point(clientPoint(clientX, clientY));
		if (!point || !this.#projection || !this.#grid) return -1;
		const world = this.#projection.toWorld(point);
		const col = Math.floor(world.x / this.#grid.cell);
		const row = Math.floor(world.y / this.#grid.cell);
		return col >= 0 &&
			col < this.#grid.columns &&
			row >= 0 &&
			row < this.#grid.rows
			? row * this.#grid.columns + col
			: -1;
	}
}
