import type { PaintContext } from "@/render/surface";
import type { BoardScene } from "@/games/defense/render/scene";
import { defenseTheme } from "@/games/defense/theme";

export function drawSelection(ctx: PaintContext, scene: BoardScene): void {
	for (const { position: p, allowed, hover } of scene.placement) {
		if (allowed || hover) {
			ctx.globalAlpha = hover ? 1 : 0.55;
			ctx.strokeStyle = allowed
				? defenseTheme.board.buildAllowed
				: defenseTheme.board.buildBlocked;
			ctx.lineWidth = hover ? 3 : 1;
			ctx.strokeRect(p.x - 21, p.y - 21, 42, 42);
		}
		if (hover && !allowed) {
			ctx.beginPath();
			ctx.moveTo(p.x - 7, p.y - 7);
			ctx.lineTo(p.x + 7, p.y + 7);
			ctx.moveTo(p.x + 7, p.y - 7);
			ctx.lineTo(p.x - 7, p.y + 7);
			ctx.stroke();
		}
	}

	ctx.globalAlpha = 1;
	if (scene.selected) {
		const p = scene.selected;
		ctx.strokeStyle = defenseTheme.board.selection;
		ctx.lineWidth = 2;
		ctx.strokeRect(p.x - 22, p.y - 22, 44, 44);
	}
}

/** Placement tint is a zone; its outline remains above objects and labels. */
export function drawPlacementZones(ctx: PaintContext, scene: BoardScene): void {
	for (const { position: p, allowed } of scene.placement) {
		ctx.fillStyle = allowed
			? defenseTheme.board.buildAllowed
			: defenseTheme.board.background;
		ctx.globalAlpha = allowed ? 0.2 : 0.6;
		ctx.fillRect(p.x - 23, p.y - 23, 46, 46);
	}
	ctx.globalAlpha = 1;
}
