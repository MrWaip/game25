import { drawPlacementZones } from "@/games/defense/render/placement";
import type { PaintContext } from "@/render/surface";
import type { BoardScene, CircleVisual } from "@/games/defense/render/scene";
import { defenseTheme } from "@/games/defense/theme";
const { snow, units, portal } = defenseTheme;

export function drawZones(ctx: PaintContext, scene: BoardScene): void {
	drawPlacementZones(ctx, scene);
	if (scene.snow) {
		const { position: p, radius } = scene.snow;
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
			const drift = Math.sin(scene.time + i) * 2;
			ctx.fillRect(
				p.x + Math.cos(angle) * r,
				p.y + Math.sin(angle) * r + drift,
				2,
				2,
			);
		}
	}
	if (scene.portalLink) {
		const { from: a, to: b } = scene.portalLink;
		ctx.strokeStyle = portal.link;
		ctx.lineWidth = 2;
		ctx.setLineDash([4, 6]);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.bezierCurveTo(
			scene.grid.width / 2,
			a.y,
			scene.grid.width / 2,
			b.y,
			b.x,
			b.y,
		);
		ctx.stroke();
		ctx.setLineDash([]);
	}
	if (scene.range)
		drawCircle(ctx, scene.range, units.rangeFill, units.rangeEdge);
	for (const aura of scene.auras)
		drawCircle(ctx, aura, units.auraFill, units.auraEdge);
}
function drawCircle(
	ctx: PaintContext,
	{ position: p, radius }: CircleVisual,
	fill: string,
	edge: string,
): void {
	ctx.beginPath();
	ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = edge;
	ctx.lineWidth = 1;
	ctx.stroke();
}
