import { towerPortrait } from "@/games/defense/towerPortrait";
import type { ButtonNode } from "@/render/ui/types";
import type {
	ConstructionView,
	ActionView,
	ConstructionAction,
} from "@/games/defense/interaction/model";
import type { TowerKind } from "@/games/defense/config";
import { defenseTheme } from "@/games/defense/theme";
import { CanvasUiHost, createWidgets, type UiNode } from "@/render/ui";
import { theme } from "@/ui/theme";

export const ui = createWidgets(theme.ui);
export function createUiHost(root: HTMLElement): CanvasUiHost {
	return new CanvasUiHost(root, {
		focus: theme.ui.focus,
		tooltipBackground: theme.ui.raised,
		tooltipText: theme.ui.text,
	});
}
export function compactButton(
	id: string,
	label: string,
	onPress: () => void,
	disabled = false,
): ButtonNode {
	return {
		kind: "button",
		id,
		label,
		onPress,
		disabled,
		style: {
			padding: 10,
			minHeight: 44,
			background: theme.ui.surface,
			border: theme.ui.border,
			radius: 10,
		},
		children: [
			ui.text(label, {
				size: 12,
				lineHeight: 24,
				maxLines: 1,
				align: "center",
			}),
		],
	};
}

/** A compact tower card; screens supply data and the selection action only. */
export function towerCard(
	choice: ConstructionView["choices"][number],
	select: (kind: TowerKind) => void,
	drag?: ButtonNode["drag"],
): UiNode {
	return {
		kind: "button",
		id: `build-${choice.kind}`,
		label: choice.label,
		description: choice.detail,
		disabled: choice.disabled,
		pressed: choice.selected,
		onPress: () => select(choice.kind),
		drag,
		style: {
			width: 60,
			padding: 4,
			gap: 2,
			minHeight: 64,
			radius: 3,
			border: choice.selected
				? defenseTheme.towers[choice.kind]
				: defenseTheme.towerCards[choice.kind],
			background: defenseTheme.towerCards[choice.kind],
		},
		children: [
			ui.text(choice.title, {
				size: 9,
				lineHeight: 10,
				weight: 700,
				align: "center",
				color: defenseTheme.towers[choice.kind],
			}),
			towerPortrait(choice.kind),
			ui.text(choice.detail.split(" · ")[0], {
				size: 11,
				lineHeight: 12,
				weight: 700,
				align: "center",
			}),
		],
	};
}
export function actionButton(
	item: ActionView,
	act: (id: ConstructionAction) => void,
): UiNode {
	const node = compactButton(
		item.id,
		item.label,
		() => act(item.id),
		item.disabled,
	);
	node.style = {
		...node.style,
		background:
			item.tone === "primary"
				? theme.ui.action
				: item.tone === "danger"
					? theme.ui.dangerSurface
					: theme.ui.surface,
	};
	return node;
}

export function rewardCard(
	options: Parameters<typeof ui.card>[0] & {
		artwork?: UiNode;
		badge?: string;
		accent?: string;
	},
): UiNode {
	const node = ui.card(options);
	if (node.kind === "button") {
		node.style = {
			...node.style,
			padding: 10,
			gap: 8,
			minHeight: 76,
			radius: 8,
			border: options.accent ?? theme.ui.border,
		};
		node.children = [
			...(options.artwork ? [ui.column([options.artwork], { width: 40 })] : []),
			ui.column(
				[
					ui.text(options.label, {
						size: 14,
						weight: 700,
					}),
					ui.text(options.description ?? "", { size: 11, muted: true }),
					...(options.badge
						? [
								ui.text(options.badge, {
									size: 9,
									weight: 700,
									color: options.accent,
								}),
							]
						: []),
				],
				{ gap: 4 },
			),
		];
	}
	return node;
}
export function bonusChip(
	id: string,
	label: string,
	icon: string,
	onPress: () => void,
): ButtonNode {
	return {
		kind: "button",
		id,
		label,
		onPress,
		style: {
			width: 44,
			minHeight: 36,
			padding: 8,
			radius: 6,
			background: theme.ui.surface,
		},
		children: [ui.text(icon, { size: 16, align: "center" })],
	};
}

/** A permanent tray slot: starting a wave never changes the board's layout. */
export function waveButton(
	launch: ActionView | null,
	battle: boolean,
	act: (id: ConstructionAction) => void,
): ButtonNode {
	return {
		kind: "button",
		id: "startWave",
		label: launch?.label ?? "Волна идёт",
		disabled: !launch || launch.disabled,
		onPress: () => act("startWave"),
		style: {
			width: 64,
			height: 64,
			padding: 4,
			gap: 2,
			radius: 12,
			background: theme.ui.coldSurface,
		},
		children: [
			ui.text(battle ? "···" : "▶", {
				size: 24,
				lineHeight: 30,
				align: "center",
				color: theme.ui.focus,
			}),
			ui.text(
				battle
					? "В бою"
					: launch?.disabled
						? "Размести"
						: `Волна ${launch?.label.match(/\d+$/)?.[0] ?? ""}`,
				{ size: 10, lineHeight: 18, align: "center" },
			),
		],
	};
}
