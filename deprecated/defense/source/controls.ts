import type { TowerKind } from "@/games/defense/config";
import type {
	ConstructionView,
	ConstructionAction,
} from "@/games/defense/interaction/model";
import {
	towerCard,
	actionButton,
	waveButton,
	ui,
} from "@/games/defense/canvasUi";
import { theme } from "@/ui/theme";
import type { ButtonDrag } from "@/render/ui/types";
import type { UiPanel } from "@/render/ui";

/** Construction content; panel lifetime and availability belong to the screen. */
export class Controls {
	constructor(
		private readonly tray: UiPanel,
		private readonly actionsPanel: UiPanel,
		private readonly actions: {
			act(id: ConstructionAction): void;
			selectTower(kind: TowerKind): void;
			dragTower(kind: TowerKind): ButtonDrag;
		},
	) {}
	refresh(model: ConstructionView): void {
		const worldPlacement = model.actions.some(
			(action) => action.id === "placeWorld",
		);
		const choices = worldPlacement
			? [
					ui.column(
						[
							ui.text(model.hint, { style: "hint", size: 10, maxLines: 1 }),
							ui.row(
								model.actions.map((action) =>
									actionButton(action, this.actions.act),
								),
								{ gap: 4 },
							),
						],
						{ width: 252, height: 64, gap: 4 },
					),
				]
			: model.choices.map((choice) =>
					towerCard(
						choice,
						this.actions.selectTower,
						this.actions.dragTower(choice.kind),
					),
				);
		this.tray.update(
			model.visible && model.choices.length
				? ui.row(
						[
							...choices,
							waveButton(model.launch, model.battle, this.actions.act),
						],
						{ gap: 4, wrap: true },
					)
				: null,
		);
		const visible =
			model.visible &&
			model.actions.some(
				(action) =>
					action.id === "improve" ||
					action.id === "sell" ||
					action.id === "overdrive",
			);
		this.actionsPanel.update(
			visible
				? ui.column(
						[
							ui.row(
								[
									ui.text(model.hint, { style: "hint" }),
									ui.button({
										variant: "icon",
										id: "cancel",
										label: "Закрыть",
										icon: "×",
										onPress: () => this.actions.act("cancel"),
									}),
								],
								{ gap: 6, align: "center" },
							),
							ui.row(
								model.actions
									.filter((action) => action.id !== "cancel")
									.map((action) => actionButton(action, this.actions.act)),
								{ gap: 6, wrap: true },
							),
						],
						{ gap: 6, padding: 8, background: theme.ui.background, radius: 10 },
					)
				: null,
		);
	}
}
