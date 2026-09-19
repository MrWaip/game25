import type { UiNode } from "./types";

export type RibbonColors = {
	face: string;
	fold: string;
	edge: string;
	text: string;
};

/** Decorative announcement, without button interaction or focus. */
export function ribbon(title: string, colors: RibbonColors): UiNode {
	return {
		kind: "drawing",
		height: 40,
		draw(ctx, rect) {
			const width = Math.min(rect.width - 28, 260);
			const x = rect.x + (rect.width - width) / 2;
			const y = rect.y + 2;
			ctx.fillStyle = colors.fold;
			for (const side of [-1, 1]) {
				const edge = side < 0 ? x : x + width;
				ctx.beginPath();
				ctx.moveTo(edge, y + 7);
				ctx.lineTo(edge + side * 14, y + 7);
				ctx.lineTo(edge + side * 9, y + 21);
				ctx.lineTo(edge + side * 14, y + 35);
				ctx.lineTo(edge - side * 8, y + 35);
				ctx.closePath();
				ctx.fill();
			}
			ctx.fillStyle = colors.face;
			ctx.strokeStyle = colors.edge;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(x, y, width, 30, 3);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = colors.text;
			ctx.font = "800 17px sans-serif";
			ctx.textAlign = "center";
			const metrics = ctx.measureText(title);
			ctx.textBaseline = "alphabetic";
			ctx.fillText(
				title,
				x + width / 2,
				y +
					15 +
					(metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) /
						2,
			);
		},
	};
}
