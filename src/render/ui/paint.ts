import type { PaintContext } from "@/render/surface";
import type { LayoutNode, UiAppearance } from "@/render/ui/types";
import { font, lineHeight } from "@/render/ui/text";

export function paint(
	ctx: PaintContext,
	item: LayoutNode,
	appearance: UiAppearance,
	focused: string | null,
	pressed: string | null,
): void {
	const { node, rect } = item;
	ctx.save();
	ctx.beginPath();
	ctx.rect(rect.x, rect.y, rect.width, rect.height);
	ctx.clip();
	if (node.kind === "drawing") {
		node.draw(ctx, rect);
	} else if (node.kind === "text") {
		ctx.font = font(node.style);
		ctx.fillStyle = node.style.color;
		ctx.textAlign = node.style.align ?? "left";
		ctx.textBaseline = "alphabetic";
		const x =
			rect.x +
			(ctx.textAlign === "center"
				? rect.width / 2
				: ctx.textAlign === "right"
					? rect.width
					: 0);
		item.lines?.forEach((line, i) => {
			const metrics = ctx.measureText(line);
			const ascent =
				metrics.actualBoundingBoxAscent ?? (node.style.size ?? 14) * 0.8;
			const descent =
				metrics.actualBoundingBoxDescent ?? (node.style.size ?? 14) * 0.2;
			const baseline =
				rect.y +
				i * lineHeight(node.style) +
				(lineHeight(node.style) + ascent - descent) / 2;
			ctx.fillText(line, x, baseline);
		});
	} else {
		const style = node.style ?? {};
		if (node.kind === "button")
			ctx.globalAlpha *= node.disabled ? 0.42 : pressed === node.id ? 0.65 : 1;
		ctx.beginPath();
		ctx.roundRect(
			rect.x + 1,
			rect.y + 1,
			Math.max(0, rect.width - 2),
			Math.max(0, rect.height - 2),
			style.radius ?? 0,
		);
		if (style.background) {
			ctx.fillStyle = style.background;
			ctx.fill();
		}
		if (style.border || (node.kind === "button" && focused === node.id)) {
			ctx.strokeStyle =
				node.kind === "button" && focused === node.id
					? appearance.focus
					: style.border!;
			ctx.lineWidth = node.kind === "button" && focused === node.id ? 2 : 1;
			ctx.stroke();
		}
		if (style.insetBorder) {
			ctx.beginPath();
			ctx.roundRect(
				rect.x + 4,
				rect.y + 4,
				Math.max(0, rect.width - 8),
				Math.max(0, rect.height - 8),
				Math.max(0, (style.radius ?? 0) - 3),
			);
			ctx.strokeStyle = style.insetBorder;
			ctx.lineWidth = 1;
			ctx.stroke();
		}
		for (const child of item.children)
			paint(ctx, child, appearance, focused, pressed);
	}
	ctx.restore();
}
