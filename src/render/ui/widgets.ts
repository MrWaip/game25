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
export type ButtonRecipe = {
	box?: BoxStyle;
	text?: Partial<TextStyle>;
	selected?: BoxStyle;
};
export type CardRecipe = {
	box?: BoxStyle;
	title?: Partial<TextStyle>;
	description?: Partial<TextStyle>;
	caption?: Partial<TextStyle>;
	content?: BoxStyle;
	artworkWidth?: number;
};
export type WidgetRecipes<
	TextName extends string,
	ButtonName extends string,
	CardName extends string,
> = {
	text?: Record<TextName, Partial<TextStyle>>;
	buttons?: Record<ButtonName, ButtonRecipe>;
	cards?: Record<CardName, CardRecipe>;
};
type TextOptions<Name extends string> = Omit<TextStyle, "color"> & {
	color?: string;
	muted?: boolean;
	style?: Name;
};
type Action = Omit<ButtonNode, "kind" | "style" | "children">;
export type ButtonOptions<Name extends string = never> = Action & {
	variant?: Name;
	icon?: string;
	children?: UiNode[];
	style?: BoxStyle;
	textStyle?: Partial<TextStyle>;
};
export type CardOptions<Name extends string = never> = Action & {
	variant?: Name;
	title?: string;
	caption?: string;
	icon?: string;
	artwork?: UiNode;
	footer?: UiNode;
	background?: string;
	style?: BoxStyle;
};

/** Content and actions at call sites; typography and variants are defined once. */
export function createWidgets<
	TextName extends string = never,
	ButtonName extends string = never,
	CardName extends string = never,
>(
	theme: WidgetTheme,
	recipes: WidgetRecipes<TextName, ButtonName, CardName> = {},
) {
	const text = (
		value: string,
		{ muted, style: name, ...style }: TextOptions<TextName> = {},
	): UiNode => ({
		kind: "text",
		text: value,
		style: {
			size: 12,
			color: theme.text,
			...(name === undefined ? {} : recipes.text?.[name]),
			...(muted ? { color: theme.muted } : {}),
			...style,
		},
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
	const heading = (
		value: string,
		{ style: name, ...style }: TextOptions<TextName> = {},
	): UiNode =>
		text(value, {
			size: 36,
			lineHeight: 39,
			family: theme.headingFamily,
			...(name === undefined ? {} : recipes.text?.[name]),
			...style,
		});
	const button = (
		{
			variant,
			icon,
			children,
			style,
			textStyle,
			...action
		}: ButtonOptions<ButtonName>,
		overrides: BoxStyle = {},
	): ButtonNode => {
		const recipe =
			variant === undefined ? undefined : recipes.buttons?.[variant];
		return {
			kind: "button",
			...action,
			style: {
				padding: 14,
				minHeight: 48,
				justify: "center",
				align: "center",
				radius: 8,
				background: theme.action,
				...recipe?.box,
				...(action.pressed ? recipe?.selected : {}),
				...style,
				...overrides,
			},
			children: children ?? [
				text(icon ?? action.label, {
					size: 16,
					color: theme.onAction,
					align: "center",
					...recipe?.text,
					...textStyle,
				}),
			],
		};
	};
	const card = ({
		variant,
		title,
		caption,
		icon,
		artwork,
		footer,
		background,
		style,
		...action
	}: CardOptions<CardName>): ButtonNode => {
		const recipe = variant === undefined ? undefined : recipes.cards?.[variant];
		const content: UiNode[] = [];
		if (caption)
			content.push(
				text(caption, { size: 9, color: theme.muted, ...recipe?.caption }),
			);
		content.push(
			text(title ?? action.label, {
				size: 17,
				weight: 700,
				family: theme.headingFamily,
				...recipe?.title,
			}),
		);
		if (action.description)
			content.push(
				text(action.description, { size: 11, ...recipe?.description }),
			);
		if (footer) content.push(footer);
		const art = artwork ?? (icon ? text(icon, { size: 30 }) : undefined);
		return {
			kind: "button",
			...action,
			style: {
				padding: 14,
				gap: 12,
				minHeight: 112,
				direction: "row",
				background: theme.surface,
				border: theme.border,
				radius: 10,
				...recipe?.box,
				...(background === undefined ? {} : { background }),
				...style,
			},
			children: [
				...(art ? [column([art], { width: recipe?.artworkWidth ?? 38 })] : []),
				column(content, { gap: 5, ...recipe?.content }),
			],
		};
	};
	return { text, heading, column, row, button, card };
}
