import type { UiNode, LayoutNode, BoxStyle } from "@/render/ui/types";
import { lineHeight, type TextLayout } from "@/render/ui/text";

const box = (node: UiNode): BoxStyle =>
	node.kind === "panel" || node.kind === "button" ? (node.style ?? {}) : {};
function move(item: LayoutNode, dx: number, dy: number): void {
	item.rect.x += dx;
	item.rect.y += dy;
	for (const child of item.children) move(child, dx, dy);
}
function offset(
	align: BoxStyle["align"] | BoxStyle["justify"],
	spare: number,
): number {
	return align === "end"
		? Math.max(0, spare)
		: align === "center"
			? Math.max(0, spare) / 2
			: 0;
}

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
			rect: { x, y, width: Math.max(0, availableWidth), height: node.height },
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
	const style = box(node);
	const width = Math.max(
		0,
		Math.min(style.width ?? availableWidth, availableWidth),
	);
	const padding = Math.max(0, style.padding ?? 0),
		gap = Math.max(0, style.gap ?? 0);
	const inner = Math.max(0, width - padding * 2);
	const row = style.direction === "row";
	const lines: UiNode[][] = [[]];
	let used = 0;
	for (const child of node.children) {
		const basis = Math.min(inner, Math.max(0, box(child).width ?? inner));
		let line = lines[lines.length - 1];
		if (row && style.wrap && line.length && used + gap + basis > inner) {
			line = [];
			lines.push(line);
			used = 0;
		}
		used += (line.length ? gap : 0) + basis;
		line.push(child);
	}
	let cursorY = 0;
	const laidLines = lines.map((line) => {
		const bases = line.map((child) =>
			Math.min(
				inner,
				Math.max(0, box(child).width ?? (style.wrap ? inner : 0)),
			),
		);
		const weights = line.map((child) =>
			Math.max(0, box(child).grow ?? (box(child).width === undefined ? 1 : 0)),
		);
		const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
		const remaining = Math.max(
			0,
			inner -
				bases.reduce((sum, basis) => sum + basis, 0) -
				gap * Math.max(0, line.length - 1),
		);
		let cursor = 0;
		const children = line.map((child, index) => {
			const allocated = row
				? bases[index] +
					(totalWeight ? (remaining * weights[index]) / totalWeight : 0)
				: inner;
			// A growing box uses its allocated width, while its own width remains the basis.
			const growing =
				row && weights[index] > 0 && box(child).width !== undefined;
			const sized =
				growing && (child.kind === "panel" || child.kind === "button")
					? { ...child, style: { ...child.style, width: allocated } }
					: child;
			const result = layout(
				sized,
				x + padding + (row ? cursor : 0),
				y + padding + cursorY + (row ? 0 : cursor),
				allocated,
				text,
			);
			if (box(child).offsetY) move(result, 0, box(child).offsetY!);
			result.node = child;
			cursor += (row ? result.rect.width : result.rect.height) + gap;
			return result;
		});
		const height = row
			? Math.max(0, ...children.map((child) => child.rect.height))
			: Math.max(0, cursor - gap);
		cursorY += height + gap;
		return { children, height, used: Math.max(0, cursor - gap) };
	});
	const contentHeight = Math.max(0, cursorY - gap);
	const height = Math.max(
		0,
		style.minHeight ?? 0,
		style.height ?? padding * 2 + contentHeight,
	);
	const innerHeight = Math.max(0, height - padding * 2);
	for (const line of laidLines) {
		const spare = (row ? inner : innerHeight) - line.used;
		const start = offset(style.justify, spare);
		const extraGap =
			style.justify === "space-between" && line.children.length > 1
				? Math.max(0, spare) / (line.children.length - 1)
				: 0;
		for (const [index, child] of line.children.entries()) {
			const cross = row
				? (laidLines.length === 1 ? innerHeight : line.height) -
					child.rect.height
				: inner - child.rect.width;
			const along = start + index * extraGap;
			move(
				child,
				row ? along : offset(style.align, cross),
				row ? offset(style.align, cross) : along,
			);
		}
	}
	return {
		node,
		rect: { x, y, width, height },
		children: laidLines.flatMap((line) => line.children),
	};
}
