import { slotsFor, isBuildable } from "@/games/defense/board";
import {
	canRelocate,
	quoteConstruction,
} from "@/games/defense/constructionRules";
import type { PlacementPreview } from "@/games/defense/interaction/model";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import { defenseTheme } from "@/games/defense/theme";

export function drawPlacement(
	ctx: CanvasRenderingContext2D,
	state: DefenseSnapshot,
	placement: PlacementPreview | null | undefined,
): void {
	if (!placement || state.phase !== "prepare" || state.pendingWorld) return;
	ctx.save();
	for (const [cell, p] of slotsFor(state.map).entries()) {
		const allowed =
			placement.from === null
				? !!quoteConstruction(state, cell, placement.kind)
				: canRelocate(state, placement.from, cell);
		const hover = placement.hover === cell;
		if (!hover && !isBuildable(state.map, cell)) continue;
		ctx.fillStyle = allowed
			? defenseTheme.board.buildAllowed
			: defenseTheme.board.background;
		ctx.globalAlpha = allowed ? 0.2 : 0.6;
		ctx.fillRect(p.x - 23, p.y - 23, 46, 46);
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
	ctx.restore();
}
