import type {
	BoxStyle,
	ButtonNode,
	TextStyle,
	UiNode,
} from "@/render/ui/types";

export type WidgetTheme = {
	text: string;
	muted: string;
	surface: string;
	border: string;
	action: string;
	onAction: string;
	headingFamily?: string;
};
type TextOptions = Omit<TextStyle, "color"> & {
	color?: string;
	muted?: boolean;
};
type Action = Pick<
	ButtonNode,
	"id" | "label" | "onPress" | "disabled" | "tooltip" | "description"
>;
export type CardOptions = Action & {
	caption?: string;
	icon?: string;
	background?: string;
};

// Reusable defaults live in the kit. Screens only supply content and actions.
export function createWidgets(theme: WidgetTheme) {
	const text = (
		value: string,
		{ muted, ...style }: TextOptions = {},
	): UiNode => ({
		kind: "text",
		text: value,
		style: { size: 12, color: muted ? theme.muted : theme.text, ...style },
	});
	const column = (children: UiNode[], style: BoxStyle = {}): UiNode => ({
		kind: "panel",
		children,
		style: { gap: 12, ...style, direction: "column" },
	});
	const row = (children: UiNode[], style: BoxStyle = {}): UiNode => ({
		kind: "panel",
		children,
		style: { gap: 12, ...style, direction: "row" },
	});
	const heading = (value: string, style: TextOptions = {}): UiNode =>
		text(value, {
			size: 36,
			lineHeight: 39,
			family: theme.headingFamily,
			...style,
		});
	const button = (action: Action, style: BoxStyle = {}): UiNode => ({
		kind: "button",
		...action,
		style: {
			padding: 14,
			minHeight: 48,
			radius: 8,
			background: theme.action,
			...style,
		},
		children: [
			text(action.label, { size: 16, color: theme.onAction, align: "center" }),
		],
	});
	const card = ({
		caption,
		icon,
		background,
		...action
	}: CardOptions): UiNode => {
		const content: UiNode[] = [];
		if (caption) content.push(text(caption, { size: 9, muted: true }));
		content.push(
			text(action.label, {
				size: 17,
				weight: 700,
				family: theme.headingFamily,
			}),
		);
		if (action.description)
			content.push(text(action.description, { size: 11 }));
		return {
			kind: "button",
			...action,
			style: {
				padding: 14,
				gap: 12,
				minHeight: 112,
				direction: "row",
				background: background ?? theme.surface,
				border: theme.border,
				radius: 10,
			},
			children: [
				...(icon ? [column([text(icon, { size: 30 })], { width: 38 })] : []),
				column(content, { gap: 5 }),
			],
		};
	};
	return { text, heading, column, row, button, card };
}
