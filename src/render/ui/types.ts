import type { PaintContext } from "@/render/surface";
export type Rect = { x: number; y: number; width: number; height: number };
export type TextStyle = {
	color: string;
	size?: number;
	family?: string;
	weight?: number;
	lineHeight?: number;
	align?: "left" | "center" | "right";
	maxLines?: number;
};
export type BoxStyle = {
	/** Relative share of remaining row width; fixed width is the minimum when growing. */
	grow?: number;
	align?: "start" | "center" | "end";
	justify?: "start" | "center" | "end" | "space-between";
	/** Wrap rows at child widths. Unsized children take a full line. */
	wrap?: boolean;
	width?: number;
	height?: number;
	minHeight?: number;
	padding?: number;
	gap?: number;
	direction?: "row" | "column";
	background?: string;
	border?: string;
	radius?: number;
	offsetY?: number;
	insetBorder?: string;
};
type Box = { style?: BoxStyle; children: UiNode[] };
export type UiNode =
	| { kind: "text"; text: string; style: TextStyle }
	| {
			kind: "drawing";
			height: number;
			draw(ctx: PaintContext, rect: Rect): void;
	  }
	| ({ kind: "panel" } & Box)
	| ({
			kind: "button";
			id: string;
			label: string;
			description?: string;
			tooltip?: string;
			disabled?: boolean;
			pressed?: boolean;
			onPress: () => void;
			drag?: ButtonDrag;
	  } & Box);
export type ButtonDrag = {
	move(clientX: number, clientY: number): void;
	drop(clientX: number, clientY: number): void;
	cancel(): void;
};
export type ButtonNode = Extract<UiNode, { kind: "button" }>;
export type LayoutNode = {
	node: UiNode;
	rect: Rect;
	children: LayoutNode[];
	lines?: string[];
};
export type UiAppearance = {
	focus: string;
	tooltipBackground: string;
	tooltipText: string;
};
export function contains(rect: Rect, x: number, y: number): boolean {
	return (
		x >= rect.x &&
		y >= rect.y &&
		x < rect.x + rect.width &&
		y < rect.y + rect.height
	);
}
