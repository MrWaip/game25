import { towerPortrait } from "@/games/defense/towerPortrait";
import type { ButtonDrag } from "@/render/ui/types";
import type {
	ConstructionView,
	ActionView,
	ConstructionAction,
} from "@/games/defense/interaction/model";
import type { TowerKind } from "@/games/defense/config";
import { defenseTheme, defenseUi } from "@/games/defense/theme";
import { CanvasUiPanels, createWidgets } from "@/render/ui";
import { theme } from "@/ui/theme";

export const ui = createWidgets(theme.ui, defenseUi);
export function createUiPanels(): CanvasUiPanels {
	return new CanvasUiPanels({
		focus: theme.ui.focus,
		tooltipBackground: theme.ui.raised,
		tooltipText: theme.ui.text,
	});
}

/** Screens supply data and the selection action; layout belongs to the recipe. */
export function towerCard(
	choice: ConstructionView["choices"][number],
	select: (kind: TowerKind) => void,
	drag?: ButtonDrag,
) {
	return ui.button({
		variant: "tower",
		id: `build-${choice.kind}`,
		label: choice.label,
		description: choice.detail,
		disabled: choice.disabled,
		pressed: choice.selected,
		onPress: () => select(choice.kind),
		drag,
		style: {
			border: choice.selected
				? defenseTheme.towers[choice.kind]
				: defenseTheme.towerCards[choice.kind],
			background: defenseTheme.towerCards[choice.kind],
		},
		children: [
			ui.text(choice.title, {
				style: "towerTitle",
				color: defenseTheme.towers[choice.kind],
			}),
			towerPortrait(choice.kind),
			ui.text(choice.detail.split(" · ")[0], { style: "towerDetail" }),
		],
	});
}
export function actionButton(
	item: ActionView,
	act: (id: ConstructionAction) => void,
) {
	return ui.button({
		variant: "compact",
		id: item.id,
		label: item.label,
		disabled: item.disabled,
		onPress: () => act(item.id),
		style: {
			background:
				item.tone === "primary"
					? theme.ui.action
					: item.tone === "danger"
						? theme.ui.dangerSurface
						: theme.ui.surface,
		},
	});
}
export function bonusChip(
	id: string,
	label: string,
	icon: string,
	onPress: () => void,
) {
	return ui.button({ variant: "bonus", id, label, icon, onPress });
}
/** A permanent tray slot: starting a wave never changes the board's layout. */
export function waveButton(
	launch: ActionView | null,
	battle: boolean,
	act: (id: ConstructionAction) => void,
) {
	return ui.button({
		variant: "wave",
		id: "startWave",
		label: launch?.label ?? "Волна идёт",
		disabled: !launch || launch.disabled,
		onPress: () => act("startWave"),
		children: [
			ui.text(battle ? "···" : "▶", { style: "waveIcon" }),
			ui.text(
				battle
					? "В бою"
					: launch?.disabled
						? "Размести"
						: `Волна ${launch?.label.match(/\d+$/)?.[0] ?? ""}`,
				{ style: "waveLabel" },
			),
		],
	});
}
