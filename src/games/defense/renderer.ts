import { gridFor } from "@/games/defense/board";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { BoardPreview } from "@/games/defense/interaction/model";
import { drawTerrain } from "@/games/defense/render/terrain";
import { drawUnits } from "@/games/defense/render/units";
export function renderDefense(
	canvas: HTMLCanvasElement,
	state: DefenseSnapshot,
	view: BoardPreview,
): void {
	const grid = gridFor(state.map);
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	ctx.setTransform(
		canvas.width / grid.width,
		0,
		0,
		canvas.height / grid.height,
		0,
		0,
	);
	drawTerrain(ctx, state, view);
	drawUnits(ctx, state, view);
}
