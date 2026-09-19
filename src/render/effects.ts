import type { PaintContext } from "./surface";
import { arcPoint, type Point } from "@/primitives/spatial";

export type ProjectileStyle = {
	kind: "arrow" | "liquid";
	flightTime: number;
	color: string;
	highlight: string;
	flame?: FlameColors;
};

export type EffectLayer = "ground" | "air";

export function paintProjectile(
	ctx: PaintContext,
	from: Point,
	to: Point,
	age: number,
	style: ProjectileStyle,
	layer: EffectLayer,
): void {
	const liquid = style.kind === "liquid";
	const flight = style.flightTime;
	if ((age >= flight && liquid ? "ground" : "air") !== layer) return;
	const origin = { x: from.x, y: from.y - 19 };
	const height = liquid ? 42 : 0;
	const destination = { x: to.x, y: to.y - (liquid ? 0 : 12) };
	const t = Math.min(1, age / flight);
	ctx.save();
	if (age < flight) {
		const p = arcPoint(origin, destination, t, height);
		const tail = arcPoint(origin, destination, Math.max(0, t - 0.12), height);
		for (let i = 1; i <= 5; i++) {
			const trail = arcPoint(
				origin,
				destination,
				Math.max(0, t - i * 0.045),
				height,
			);
			ctx.globalAlpha = (1 - i / 6) * 0.4;
			ctx.fillStyle = style.flame?.middle ?? style.color;
			ctx.beginPath();
			ctx.arc(trail.x, trail.y, liquid ? 3 : 2, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
		ctx.translate(p.x, p.y);
		ctx.rotate(Math.atan2(p.y - tail.y, p.x - tail.x));
		ctx.fillStyle = style.color;
		if (liquid) {
			ctx.beginPath();
			ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = style.highlight;
			ctx.beginPath();
			ctx.ellipse(-1, -2, 3, 1, 0, 0, Math.PI * 2);
			ctx.fill();
		} else {
			ctx.strokeStyle = style.color;
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.moveTo(-17, 0);
			ctx.lineTo(7, 0);
			ctx.stroke();
			ctx.strokeStyle = style.highlight;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.fillStyle = style.highlight;
			ctx.beginPath();
			ctx.moveTo(10, 0);
			ctx.lineTo(4, -3);
			ctx.lineTo(4, 3);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(-10, 0);
			ctx.lineTo(-15, -4);
			ctx.lineTo(-12, 0);
			ctx.lineTo(-15, 4);
			ctx.closePath();
			ctx.fill();
			if (style.flame) paintFlame(ctx, 6, 2, 9, age * 4, style.flame);
		}
	} else {
		const impact = (age - flight) / 0.55;
		paintBurst(
			ctx,
			to.x,
			destination.y,
			impact,
			style.flame?.middle ?? style.color,
			liquid ? 10 : 5,
			liquid ? 30 : 18,
			liquid ? 36 : 12,
		);
		if (liquid) {
			ctx.globalAlpha = Math.max(0, 1 - impact) * 0.6;
			ctx.fillStyle = style.color;
			for (let i = 0; i < 6; i++) {
				const angle = i * 2.4;
				ctx.beginPath();
				ctx.ellipse(
					to.x + Math.cos(angle) * 14,
					to.y + Math.sin(angle) * 8,
					8 + (i % 3),
					3 + (i % 2),
					angle,
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}
		} else if (impact < 0.4) {
			ctx.globalAlpha = 1 - impact * 2.5;
			ctx.strokeStyle = style.flame?.core ?? style.highlight;
			ctx.lineWidth = 2;
			for (let i = 0; i < 4; i++) {
				const angle = (i * Math.PI) / 2 + 0.4;
				ctx.beginPath();
				ctx.moveTo(to.x, destination.y);
				ctx.lineTo(
					to.x + Math.cos(angle) * 12,
					destination.y + Math.sin(angle) * 12,
				);
				ctx.stroke();
			}
		}
	}
	ctx.restore();
}

export type FlameColors = {
	edge: string;
	middle: string;
	core: string;
	smoke: string;
};

/** Time-driven effects have no random mutable state and freeze naturally on pause. */
export function paintFlame(
	ctx: PaintContext,
	x: number,
	y: number,
	size: number,
	time: number,
	colors: FlameColors,
): void {
	ctx.save();
	const sway = Math.sin(time * 13) * size * 0.16;
	const height = size * (1.1 + Math.sin(time * 19) * 0.12);
	ctx.globalAlpha *= 0.85;
	for (const layer of [
		{ scale: 1, color: colors.edge },
		{ scale: 0.7, color: colors.middle },
		{ scale: 0.36, color: colors.core },
	]) {
		const width = size * layer.scale * 0.42,
			h = height * layer.scale;
		ctx.fillStyle = layer.color;
		ctx.beginPath();
		ctx.moveTo(x, y + 2);
		ctx.bezierCurveTo(
			x - width * 1.7,
			y,
			x - width,
			y - h * 0.5,
			x + sway,
			y - h,
		);
		ctx.bezierCurveTo(
			x + sway - width * 0.3,
			y - h * 0.3,
			x + width * 1.6,
			y - h * 0.3,
			x,
			y + 2,
		);
		ctx.fill();
	}
	ctx.restore();
}

export function paintBurst(
	ctx: PaintContext,
	x: number,
	y: number,
	progress: number,
	color: string,
	count: number,
	radius: number,
	gravity = 30,
): void {
	if (progress < 0 || progress >= 1) return;
	ctx.save();
	ctx.globalAlpha *= (1 - progress) ** 2;
	ctx.fillStyle = color;
	for (let i = 0; i < count; i++) {
		const angle = i * 2.39996;
		const speed = radius * (0.55 + (i % 4) * 0.15);
		const dx = Math.cos(angle) * speed * progress;
		const dy =
			Math.sin(angle) * speed * progress * 0.65 + gravity * progress * progress;
		const size = (2 + (i % 3)) * (1 - progress * 0.7);
		ctx.beginPath();
		ctx.ellipse(x + dx, y + dy, size, size * 0.65, angle, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();
}

export function paintSmoke(
	ctx: PaintContext,
	x: number,
	y: number,
	time: number,
	color: string,
): void {
	ctx.save();
	ctx.fillStyle = color;
	for (let i = 0; i < 3; i++) {
		const age = (time * 0.65 + i / 3) % 1;
		ctx.globalAlpha = (1 - age) * 0.08;
		ctx.beginPath();
		ctx.arc(
			x + Math.sin(time + i * 3) * age * 9,
			y - 8 - age * 14,
			2 + age * 3,
			0,
			Math.PI * 2,
		);
		ctx.fill();
	}
	ctx.restore();
}
