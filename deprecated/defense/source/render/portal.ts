import type { PaintContext } from "@/render/surface";
import { defenseTheme } from "@/games/defense/theme";
import type { PortalVisual } from "@/games/defense/render/scene";

/** Inward teeth mark intake; outward teeth mark release. No labels cover enemies. */
export function drawPortal(
	ctx: PaintContext,
	{ position: p, role, ready, progress }: PortalVisual,
	time: number,
): void {
	const palette = defenseTheme.portal;
	const color = role === "entrance" ? palette.entrance : palette.edge;
	ctx.fillStyle = palette.fill;
	ctx.beginPath();
	ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = ready ? color : palette.cooldown;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
	ctx.stroke();
	ctx.strokeStyle = color;
	ctx.lineWidth = 3;
	if (!ready) {
		ctx.beginPath();
		ctx.arc(p.x, p.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
		ctx.stroke();
	}
	ctx.fillStyle = ready ? color : palette.cooldown;
	for (let i = 0; i < 3; i++) {
		const angle = (i * Math.PI * 2) / 3 + (ready ? time * 0.6 : 0);
		const tip = role === "entrance" ? 8 : 21;
		const base = role === "entrance" ? 14 : 15;
		ctx.beginPath();
		ctx.moveTo(p.x + Math.cos(angle) * tip, p.y + Math.sin(angle) * tip);
		ctx.lineTo(
			p.x + Math.cos(angle + 0.22) * base,
			p.y + Math.sin(angle + 0.22) * base,
		);
		ctx.lineTo(
			p.x + Math.cos(angle - 0.22) * base,
			p.y + Math.sin(angle - 0.22) * base,
		);
		ctx.closePath();
		ctx.fill();
	}
	ctx.fillStyle = palette.spark;
	for (let i = 0; ready && i < 4; i++) {
		const cycle = (time * 0.65 + i / 4) % 1;
		const radius = role === "entrance" ? 15 * (1 - cycle) : 15 * cycle;
		const angle = (i * Math.PI) / 2 + time;
		ctx.beginPath();
		ctx.arc(
			p.x + Math.cos(angle) * radius,
			p.y + Math.sin(angle) * radius,
			1.2,
			0,
			Math.PI * 2,
		);
		ctx.fill();
	}
}
