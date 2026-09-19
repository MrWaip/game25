import { ribbon } from "@/render/ui/ribbon";
import { CanvasUiPanels, createWidgets, type UiNode } from "@/render/ui";
import type { RelicDefinition, RelicRarity, SpriteId } from "./model";
import { rarityLooks } from "./relicView";
import { spriteSource, type DefenseAssets } from "./assets";
import { theme } from "./theme";
export const ui = createWidgets({
	text: theme.text,
	muted: theme.muted,
	surface: theme.panel,
	border: theme.border,
	action: theme.blue,
	onAction: theme.text,
});
export function createPanels(): CanvasUiPanels {
	return new CanvasUiPanels({
		focus: theme.gold,
		tooltipBackground: theme.panel,
		tooltipText: theme.text,
	});
}
export function portrait(
	assets: DefenseAssets,
	sprite: SpriteId,
	height = 64,
): UiNode {
	return {
		kind: "drawing",
		height,
		draw(ctx, rect) {
			const source = spriteSource(assets, sprite),
				size = Math.min(rect.width, rect.height);
			const scale = size / Math.max(source.width, source.height);
			const width = source.width * scale,
				height = source.height * scale;
			ctx.drawImage(
				source.image,
				source.x,
				source.y,
				source.width,
				source.height,
				rect.x + (rect.width - width) / 2,
				rect.y + (size - height) / 2,
				width,
				height,
			);
		},
	};
}
export type ActionTone = "primary" | "secondary";
export type ActionStyle = { tone?: ActionTone; width?: number; icon?: string };
export function action(
	id: string,
	label: string,
	onPress: () => void,
	disabled = false,
	appearance: ActionStyle = {},
): UiNode {
	return ui.button({
		id,
		label,
		icon: appearance.icon,
		onPress,
		disabled,
		style: {
			padding: 8,
			minHeight: 44,
			radius: 7,
			width: appearance.width,
			background: appearance.tone === "primary" ? theme.blue : theme.raised,
			border: theme.border,
		},
		textStyle: { size: 12, weight: 600 },
	});
}
export function card(
	id: string,
	title: string,
	description: string,
	art: UiNode,
	onPress: () => void,
	disabled = false,
): UiNode {
	return ui.button({
		id,
		label: title,
		description,
		onPress,
		disabled,
		style: {
			padding: 6,
			gap: 4,
			minHeight: 174,
			justify: "start",
			background: theme.card,
			border: theme.border,
			insetBorder: theme.cardEdge,
			radius: 8,
		},
		children: [
			art,
			ui.column(
				[
					ui.text(title, {
						size: 11,
						lineHeight: 14,
						weight: 700,
						align: "center",
					}),
				],
				{ minHeight: 28, justify: "center" },
			),
			ui.text(description, {
				size: 10,
				lineHeight: 13,
				align: "center",
				color: theme.muted,
			}),
		],
	});
}
export function placeholders(count: number): UiNode[] {
	return Array.from({ length: count }, (_, i) =>
		card(
			`placeholder-${i}`,
			"Скоро",
			"",
			ui.column(
				[ui.text("◇", { size: 32, align: "center", color: theme.muted })],
				{ height: 58, justify: "center" },
			),
			() => {},
			true,
		),
	);
}
export function panel(
	title: string,
	children: UiNode[],
	celebration = false,
): UiNode {
	return ui.column(
		[
			celebration
				? ribbon(title, {
						face: theme.blue,
						fold: theme.blueEdge,
						edge: theme.blueHighlight,
						text: theme.text,
					})
				: ui.text(title, { size: 18, weight: 800, align: "center" }),
			...children,
		],
		{
			background: theme.panel,
			border: theme.border,
			radius: 16,
			padding: 10,
			gap: 8,
		},
	);
}
export function relicArt(
	assets: DefenseAssets,
	sprite: SpriteId,
	rarity: RelicRarity,
	height = 58,
): UiNode {
	const look = rarityLooks[rarity];
	const base = portrait(assets, sprite, height);
	return {
		kind: "drawing",
		height,
		draw(ctx, rect) {
			const cx = rect.x + rect.width / 2,
				cy = rect.y + rect.height / 2,
				radius = rect.height * 0.55;
			const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
			glow.addColorStop(0, `${look.frame}aa`);
			glow.addColorStop(1, `${look.frame}00`);
			ctx.fillStyle = glow;
			ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
			if (base.kind === "drawing") base.draw(ctx, rect);
			if (!look.shine) return;
			const phase = (performance.now() / 2000) % 1;
			const x = rect.x - rect.width + phase * rect.width * 3;
			ctx.save();
			ctx.beginPath();
			ctx.rect(rect.x, rect.y, rect.width, rect.height);
			ctx.clip();
			const glint = ctx.createLinearGradient(x, rect.y, x + 24, rect.y + 24);
			glint.addColorStop(0, "#fff0");
			glint.addColorStop(0.5, "#fff8");
			glint.addColorStop(1, "#fff0");
			ctx.globalCompositeOperation = "lighter";
			ctx.fillStyle = glint;
			ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
			ctx.restore();
		},
	};
}
export function relicCard(
	assets: DefenseAssets,
	relic: RelicDefinition,
	onPress: () => void,
	pressed = false,
): UiNode {
	const look = rarityLooks[relic.rarity];
	return ui.button({
		id: relic.id,
		label: relic.title,
		description: `${look.label} · ${relic.description}`,
		onPress,
		pressed,
		style: {
			padding: 6,
			gap: 3,
			minHeight: 188,
			justify: "start",
			background: pressed ? theme.raised : theme.card,
			border: look.frame,
			insetBorder: look.ribbon,
			radius: 8,
		},
		children: [
			ui.text(look.label.toUpperCase(), {
				size: 9,
				weight: 800,
				align: "center",
				color: look.frame,
			}),
			relicArt(assets, relic.sprite, relic.rarity),
			ui.column(
				[
					ui.text(relic.title, {
						size: 11,
						lineHeight: 14,
						weight: 700,
						align: "center",
					}),
				],
				{ minHeight: 28, justify: "center" },
			),
			ui.text(relic.description, {
				size: 10,
				lineHeight: 13,
				align: "center",
				color: theme.muted,
			}),
		],
	});
}
