import type { UiNode, LayoutNode } from "@/render/ui/types";
import { lineHeight, type TextLayout } from "@/render/ui/text";

export function layout(
	node: UiNode,
	x: number,
	y: number,
	availableWidth: number,
	text: TextLayout,
): LayoutNode {
	if (node.kind === "drawing")
		return {
			node,
			rect: { x, y, width: availableWidth, height: node.height },
			children: [],
		};
	if (node.kind === "text") {
		const width = Math.max(0, availableWidth);
		const lines = text.wrap(node.text, node.style, width);
		return {
			node,
			rect: { x, y, width, height: lines.length * lineHeight(node.style) },
			lines,
			children: [],
		};
	}
	const style = node.style ?? {};
	const width = Math.max(
		0,
		Math.min(style.width ?? availableWidth, availableWidth),
	);
	const padding = Math.max(0, style.padding ?? 0),
		gap = style.gap ?? 0;
	const inner = Math.max(0, width - padding * 2);
	const row = style.direction === "row";
	const fixed = node.children.reduce(
		(sum, child) =>
			sum +
			(child.kind !== "text" && child.kind !== "drawing"
				? (child.style?.width ?? 0)
				: 0),
		0,
	);
	const flexible = node.children.filter(
		(child) =>
			child.kind === "text" ||
			child.kind === "drawing" ||
			child.style?.width === undefined,
	).length;
	const share = Math.max(
		0,
		(inner - fixed - gap * Math.max(0, node.children.length - 1)) /
			Math.max(1, flexible),
	);
	let cursor = 0,
		cross = 0;
	const children = node.children.map((child) => {
		const childWidth = row
			? child.kind !== "text" && child.kind !== "drawing"
				? (child.style?.width ?? share)
				: share
			: inner;
		const result = layout(
			child,
			x + padding + (row ? cursor : 0),
			y + padding + (row ? 0 : cursor),
			Math.min(inner, childWidth),
			text,
		);
		cursor += (row ? result.rect.width : result.rect.height) + gap;
		cross = Math.max(cross, result.rect.height);
		return result;
	});
	const height = Math.max(
		style.minHeight ?? 0,
		style.height ?? padding * 2 + (row ? cross : Math.max(0, cursor - gap)),
	);
	return { node, rect: { x, y, width, height }, children };
}
