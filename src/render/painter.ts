import type { PaintContext } from "@/render/surface";

type Point = Readonly<{ x: number; y: number }>;
export type ShapeStyle = {
	fill?: string;
	stroke?: string;
	lineWidth?: number;
};
export type PaintTextStyle = {
	color: string;
	font?: string;
	align?: "left" | "center" | "right";
	anchor?: "baseline" | "center" | "top";
};

/** Complete operations in the caller's coordinate space, clip and opacity.
 * Each operation owns its path and restores drawing state, including on failure.
 * The painter has the same lifetime as its PaintContext (one surface frame).
 */
export function createPainter<Name extends string = never>(
	ctx: PaintContext,
	styles: Record<Name, PaintTextStyle> = {} as Record<Name, PaintTextStyle>,
) {
	const scoped = (paint: () => void) => {
		ctx.save();
		try {
			ctx.beginPath();
			ctx.shadowBlur = 0;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			paint();
		} finally {
			ctx.beginPath();
			ctx.restore();
		}
	};
	const shape = (path: () => void, style: ShapeStyle) =>
		scoped(() => {
			path();
			if (style.fill !== undefined) {
				ctx.fillStyle = style.fill;
				ctx.fill();
			}
			if (style.stroke !== undefined) {
				ctx.strokeStyle = style.stroke;
				ctx.lineWidth = style.lineWidth ?? 1;
				ctx.lineCap = "butt";
				ctx.lineJoin = "miter";
				ctx.setLineDash([]);
				ctx.stroke();
			}
		});
	return {
		circle(position: Point, radius: number, style: ShapeStyle) {
			shape(
				() => ctx.arc(position.x, position.y, radius, 0, Math.PI * 2),
				style,
			);
		},
		ellipse(
			position: Point,
			radiusX: number,
			radiusY: number,
			style: ShapeStyle,
		) {
			shape(
				() =>
					ctx.ellipse(
						position.x,
						position.y,
						radiusX,
						radiusY,
						0,
						0,
						Math.PI * 2,
					),
				style,
			);
		},
		rect(
			x: number,
			y: number,
			width: number,
			height: number,
			style: ShapeStyle & { radius?: number },
		) {
			shape(() => ctx.roundRect(x, y, width, height, style.radius ?? 0), style);
		},
		arc(
			position: Point,
			radius: number,
			start: number,
			end: number,
			style: ShapeStyle,
		) {
			shape(() => ctx.arc(position.x, position.y, radius, start, end), style);
		},
		line(from: Point, to: Point, style: Omit<ShapeStyle, "fill">) {
			shape(() => {
				ctx.moveTo(from.x, from.y);
				ctx.lineTo(to.x, to.y);
			}, style);
		},
		text(
			value: string,
			position: Point,
			options: (Partial<PaintTextStyle> & { style: Name }) | PaintTextStyle,
		) {
			const resolved = {
				...("style" in options ? styles[options.style] : {}),
				...options,
			};
			scoped(() => {
				ctx.fillStyle = resolved.color!;
				ctx.font = resolved.font ?? "12px sans-serif";
				ctx.textAlign =
					resolved.align ?? (resolved.anchor === "center" ? "center" : "left");
				ctx.textBaseline = "alphabetic";
				let y = position.y;
				if (resolved.anchor === "center" || resolved.anchor === "top") {
					const metrics = ctx.measureText(value);
					y +=
						resolved.anchor === "center"
							? (metrics.actualBoundingBoxAscent -
									metrics.actualBoundingBoxDescent) /
								2
							: metrics.actualBoundingBoxAscent;
				}
				ctx.fillText(value, position.x, y);
			});
		},
	};
}
