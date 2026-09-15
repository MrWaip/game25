import { drawPlacement } from "@/games/defense/render/placement";
import { drawPortal } from "@/games/defense/render/portal";
import { defenseTheme } from "@/games/defense/theme";
const { board, snow, portal } = defenseTheme;
import { isConstructionSite } from "@/games/defense/constructionRules";
import { gridFor, slotsFor, isBuildable } from "@/games/defense/board";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { BoardPreview } from "@/games/defense/interaction/model";
import { snowRadius } from "@/games/defense/effects/snow";
import { buildModifiers } from "@/games/defense/effects/buildModifiers";

export function drawTerrain(
	ctx: CanvasRenderingContext2D,
	state: DefenseSnapshot,
	view: BoardPreview,
): void {
	const grid = gridFor(state.map),
		slots = slotsFor(state.map);
	ctx.fillStyle = board.background;
	ctx.fillRect(0, 0, grid.width, grid.height);
	for (const [index, cell] of slots.entries()) {
		if (!isBuildable(state.map, index)) continue;
		if (
			!isConstructionSite(state.map, index) &&
			!state.towers.some((tower) => tower.slot === index)
		) {
			// Quiet terrain has no tile borders or placement dot.
			ctx.fillStyle = board.cell;
			ctx.globalAlpha = 0.25;
			ctx.fillRect(cell.x - 5, cell.y + 3, 9, 4);
			ctx.globalAlpha = 1;
			continue;
		}
		ctx.fillStyle = index % 3 === 0 ? board.cellAccent : board.cell;
		ctx.fillRect(cell.x - 23, cell.y - 23, 46, 46);
		ctx.fillStyle = board.dot;
		ctx.fillRect(cell.x - 1, cell.y - 1, 2, 2);
	}
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.strokeStyle = board.road;
	ctx.lineWidth = 40;
	ctx.beginPath();
	const edges = new Set<string>();
	for (const route of state.map.paths) {
		for (let i = 1; i < route.length; i++) {
			const a = route[i - 1],
				b = route[i];
			const key = `${a.x},${a.y}:${b.x},${b.y}`;
			if (edges.has(key)) continue;
			edges.add(key);
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
		}
	}
	ctx.stroke();
	ctx.strokeStyle = board.roadMark;
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 8]);
	ctx.stroke();
	ctx.setLineDash([]);
	const snowCell = view.snow;
	if (snowCell !== null) {
		const p = slots[snowCell],
			radius = snowRadius(buildModifiers(state.bonuses));
		const gradient = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, radius);
		gradient.addColorStop(0, snow.fill);
		gradient.addColorStop(1, "transparent");
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = snow.edge;
		ctx.lineWidth = 1.5;
		ctx.setLineDash([5, 5]);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillStyle = snow.flake;
		for (let i = 0; i < 28; i++) {
			const angle = i * 2.4,
				r = 12 + ((i * 19) % (radius - 16));
			const drift = Math.sin(state.elapsed + i) * 2;
			ctx.fillRect(
				p.x + Math.cos(angle) * r,
				p.y + Math.sin(angle) * r + drift,
				2,
				2,
			);
		}
	}
	if (state.portal) {
		const a = slots[state.portal.entrance],
			b = slots[state.portal.exit];
		ctx.strokeStyle = portal.link;
		ctx.lineWidth = 2;
		ctx.setLineDash([4, 6]);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.bezierCurveTo(grid.width / 2, a.y, grid.width / 2, b.y, b.x, b.y);
		ctx.stroke();
		ctx.setLineDash([]);
		drawPortal(
			ctx,
			slots[state.portal.entrance],
			"entrance",
			state.portal.cooldown,
			state.elapsed,
		);
		drawPortal(ctx, slots[state.portal.exit], "exit", 0, state.elapsed);
	}
	if (view.portalEntrance !== null)
		drawPortal(ctx, slots[view.portalEntrance], "entrance", 0, state.elapsed);
	drawPlacement(ctx, state, view.placement);
	if (view.selected !== null) {
		const p = slots[view.selected];
		ctx.strokeStyle = board.selection;
		ctx.lineWidth = 2;
		ctx.strokeRect(p.x - 22, p.y - 22, 44, 44);
	}
	ctx.font = "bold 9px sans-serif";
	ctx.textAlign = "left";
	ctx.fillStyle = board.label;
	const portals = [
		state.portal?.entrance,
		state.portal?.exit,
		view.portalEntrance,
	]
		.filter((cell): cell is number => cell !== null && cell !== undefined)
		.map((cell) => slots[cell]);
	const labelX = (x: number, y: number) => {
		if (!portals.some((p) => Math.abs(p.x - x) < 24 && Math.abs(p.y - y) < 24))
			return x;
		ctx.textAlign = x < grid.width / 2 ? "left" : "right";
		return x + (x < grid.width / 2 ? 26 : -26);
	};
	for (const x of new Set(state.map.paths.map((path) => path[0].x))) {
		ctx.textAlign = x < grid.width / 2 ? "left" : "right";
		ctx.fillText("↓ ВХОД", labelX(x, 14), 14);
	}
	const base = state.map.paths[0].at(-1)!;
	ctx.textAlign = "center";
	ctx.fillText("БАЗА ↓", labelX(base.x, grid.height - 11), grid.height - 11);
}
