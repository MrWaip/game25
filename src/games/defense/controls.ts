import type { TowerKind } from "@/games/defense/config";
import type {
	ConstructionView,
	ConstructionAction,
} from "@/games/defense/interaction/model";
import {
	createUiHost,
	towerCard,
	actionButton,
	waveButton,
	compactButton,
	ui,
} from "@/games/defense/canvasUi";
import { theme } from "@/ui/theme";
import type { ButtonDrag } from "@/render/ui/types";
import type { UiNode } from "@/render/ui";

/** Two Canvas panels share the controller's projection: seed tray and actions. */
export class Controls {
	#trayHost;
	#host;
	#model: ConstructionView | null = null;
	constructor(
		private readonly tray: HTMLElement,
		private readonly root: HTMLElement,
		private readonly actions: {
			act(id: ConstructionAction): void;
			selectTower(kind: TowerKind): void;
			dragTower(kind: TowerKind): ButtonDrag;
		},
	) {
		this.#trayHost = createUiHost(tray);
		tray.style.touchAction = "none";
		this.#trayHost.canvas.style.touchAction = "none";
		this.#host = createUiHost(root);
	}
	refresh(model: ConstructionView, paused: boolean): void {
		this.#model = model;
		this.tray.hidden = !model.visible || !model.choices.length;
		this.root.hidden =
			!model.visible ||
			!model.actions.some(
				(action) => action.id === "improve" || action.id === "sell",
			);
		const worldPlacement = model.actions.some(
			(action) => action.id === "placeWorld",
		);
		this.#trayHost.enabled = !paused && !this.tray.hidden;
		this.#host.enabled = !paused && model.visible;
		if (!model.visible) return;
		this.#trayHost.show(
			ui.row(
				[
					...(worldPlacement
						? [
								ui.column(
									[
										ui.text(model.hint, {
											size: 10,
											lineHeight: 16,
											maxLines: 1,
										}),
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
							)),
					waveButton(model.launch, model.battle, this.actions.act),
				],
				{ gap: 4 },
			),
			false,
		);
		this.#render();
	}
	#render(): void {
		const model = this.#model!;
		const close = compactButton("cancel", "Закрыть", () =>
			this.actions.act("cancel"),
		);
		close.style = { ...close.style, width: 44, padding: 0, border: undefined };
		close.children = [
			ui.text("×", { size: 22, lineHeight: 44, align: "center" }),
		];
		const nodes: UiNode[] = [
			ui.row(
				[ui.text(model.hint, { size: 11, maxLines: 2, lineHeight: 16 }), close],
				{ gap: 6 },
			),
			ui.row(
				model.actions
					.filter((action) => action.id !== "cancel")
					.map((action) => actionButton(action, this.actions.act)),
				{ gap: 6 },
			),
		];
		this.#host.show(
			ui.column(nodes, {
				gap: 6,
				padding: 8,
				background: theme.ui.background,
				radius: 10,
			}),
			false,
		);
	}
	advance(dt: number): void {
		this.#trayHost.advance(dt);
		this.#host.advance(dt);
	}
	destroy(): void {
		this.#trayHost.destroy();
		this.#host.destroy();
	}
}
