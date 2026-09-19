import type { PaintContext } from "@/render/surface";
import type { BoardScene } from "@/games/defense/render/scene";
import { defenseTheme } from "@/games/defense/theme";
const { board } = defenseTheme;

export function drawTerrain(ctx: PaintContext, scene: BoardScene): void {
	const { grid } = scene;
	ctx.fillStyle = board.background;
	ctx.fillRect(0, 0, grid.width, grid.height);
	for (const { position: cell, tone } of scene.cells) {
		if (tone === "quiet") {
			ctx.fillStyle = board.cell;
			ctx.globalAlpha = 0.25;
			ctx.fillRect(cell.x - 5, cell.y + 3, 9, 4);
			ctx.globalAlpha = 1;
			continue;
		}
		if (tone === "locked") {
			ctx.strokeStyle = board.dot;
			ctx.globalAlpha = 0.45;
			ctx.setLineDash([3, 5]);
			ctx.strokeRect(cell.x - 16, cell.y - 16, 32, 32);
			ctx.setLineDash([]);
			ctx.beginPath();
			ctx.moveTo(cell.x - 4, cell.y);
			ctx.lineTo(cell.x + 4, cell.y);
			ctx.stroke();
			ctx.globalAlpha = 1;
			continue;
		}
		ctx.fillStyle = tone === "accent" ? board.cellAccent : board.cell;
		ctx.beginPath();
		ctx.roundRect(cell.x - 20, cell.y - 20, 40, 40, 8);
		ctx.fill();
		ctx.strokeStyle = board.dot;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.fillStyle = board.dot;
		ctx.fillRect(cell.x - 1, cell.y - 1, 2, 2);
	}
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.strokeStyle = board.road;
	ctx.lineWidth = 40;
	ctx.beginPath();
	for (const { from, to } of scene.roads) {
		ctx.moveTo(from.x, from.y);
		ctx.lineTo(to.x, to.y);
	}
	ctx.stroke();
	ctx.strokeStyle = board.roadMark;
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 8]);
	ctx.stroke();
	ctx.setLineDash([]);
}
