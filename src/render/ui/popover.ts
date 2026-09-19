import type { Rect } from "./types";

/** Place a floating panel above its anchor, flipping below at the viewport edge. */
export function placePopover(
	anchor: Rect,
	bounds: Rect,
	size: { width: number; height: number },
): { x: number; y: number } {
	const gap = 8;
	const above = anchor.y - size.height - gap;
	const y = above >= bounds.y ? above : anchor.y + anchor.height + gap;
	return {
		x: Math.max(
			bounds.x,
			Math.min(
				anchor.x + (anchor.width - size.width) / 2,
				bounds.x + bounds.width - size.width,
			),
		),
		y: Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - size.height)),
	};
}
