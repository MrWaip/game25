import type { PaintContext } from "@/render/surface";
import type { BoardScene } from "@/games/defense/render/scene";
import { defenseTheme } from "@/games/defense/theme";

/** Procedural effects stay deterministic, bounded and frozen with the battle. */
export function drawEffects(ctx: PaintContext, scene: BoardScene): void {
	ctx.lineCap = "round";
	for (const link of scene.links) {
		ctx.strokeStyle = defenseTheme.towers.amplifier;
		ctx.globalAlpha = 0.16;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(link.from.x, link.from.y);
		ctx.lineTo(link.to.x, link.to.y);
		ctx.stroke();
		const progress = (scene.time * 0.8) % 1;
		ctx.globalAlpha = 0.75;
		ctx.fillStyle = defenseTheme.towers.amplifier;
		ctx.beginPath();
		ctx.arc(
			link.from.x + (link.to.x - link.from.x) * progress,
			link.from.y + (link.to.y - link.from.y) * progress,
			2.5,
			0,
			Math.PI * 2,
		);
		ctx.fill();
	}
	for (const shot of scene.shots.slice(-180)) {
		const p = shot.to,
			burst = shot.style !== "shot";
		ctx.globalAlpha = shot.alpha;
		ctx.strokeStyle =
			shot.style === "acid" ? defenseTheme.towers.corrode : shot.color;
		ctx.fillStyle = ctx.strokeStyle;
		ctx.shadowColor = ctx.strokeStyle;
		ctx.shadowBlur = burst ? 12 : 4;
		ctx.lineWidth = burst ? 2.5 : 1.5;
		ctx.beginPath();
		ctx.moveTo(shot.from.x, shot.from.y);
		if (shot.style === "lightning") {
			for (let i = 1; i <= 7; i++) {
				const t = i / 7;
				const offset = i === 7 ? 0 : Math.sin(i * 7 + p.x) * 9;
				ctx.lineTo(
					shot.from.x + (p.x - shot.from.x) * t + offset,
					shot.from.y + (p.y - shot.from.y) * t - offset,
				);
			}
		} else ctx.lineTo(p.x, p.y);
		ctx.stroke();
		if (burst) {
			const radius = shot.blastRadius ?? 8 + (1 - shot.alpha) * 38;
			ctx.beginPath();
			ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalAlpha = shot.alpha * 0.15;
			ctx.fill();
			ctx.globalAlpha = shot.alpha;
			const rays = shot.style === "execute" ? 4 : 8;
			for (let i = 0; i < rays; i++) {
				const angle =
					(i * Math.PI * 2) / rays +
					(shot.style === "crossfire" ? scene.time * 4 : 0);
				const inner = radius * (shot.style === "execute" ? 0.1 : 0.8);
				ctx.beginPath();
				ctx.moveTo(
					p.x + Math.cos(angle) * inner,
					p.y + Math.sin(angle) * inner,
				);
				ctx.lineTo(
					p.x + Math.cos(angle) * (radius + 9),
					p.y + Math.sin(angle) * (radius + 9),
				);
				ctx.stroke();
			}
		}
		ctx.shadowBlur = 0;
	}
	ctx.globalAlpha = 1;
}
