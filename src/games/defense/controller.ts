import type { DefenseSession } from "@/games/defense/session";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { TowerKind } from "@/games/defense/definitions/towers";
import { inspect, type Selection } from "@/games/defense/interaction/state";
import { present } from "@/games/defense/interaction/presentation";
import type {
	ConstructionAction,
	ConstructionView,
} from "@/games/defense/interaction/model";
import { quoteConstruction } from "@/games/defense/constructionRules";

/** Owns the complete construction interaction; renderers consume its projection. */
export class DefenseController {
	#selection: Selection = inspect();
	#message = "";
	#phase = "";
	constructor(private readonly session: DefenseSession) {}
	#sync(state: DefenseSnapshot): void {
		if (this.#phase !== state.phase) {
			this.#selection = inspect();
			this.#message = "";
		}
		this.#phase = state.phase;
		const selection = this.#selection;
		if (
			(selection.mode === "replace" || selection.mode === "move") &&
			!state.towers.some(
				(t) =>
					t.slot ===
					(selection.mode === "move"
						? selection.movingFrom
						: selection.selected),
			)
		)
			this.#selection = inspect();
		if (state.pendingWorld && this.#selection.mode === "inspect")
			this.#selection = {
				mode: state.pendingWorld === "snow" ? "snow" : "portalIn",
				selected: null,
			};
	}
	present(): ConstructionView {
		const state = this.session.snapshot();
		this.#sync(state);
		return present(state, this.#selection, this.#message);
	}
	selectCell(cell: number): void {
		if (!this.present().cells[cell]) return;
		const state = this.session.snapshot(),
			selection = this.#selection;
		this.#message = "";
		if (selection.mode === "move") {
			if (this.session.relocate(selection.movingFrom, cell))
				this.#selection = inspect(cell);
			return;
		}
		const occupied = state.towers.some((t) => t.slot === cell);
		if (selection.mode === "build" && !occupied) {
			this.#message = this.session.build(cell, selection.kind)
				? ""
				: "Здесь нельзя построить или не хватает монет.";
			this.#selection = { ...selection, selected: cell };
		} else if (selection.mode === "build" || selection.mode === "replace")
			this.#selection = inspect(cell);
		else this.#selection = { ...selection, selected: cell };
	}
	selectTower(kind: TowerKind): void {
		const model = this.present();
		if (
			!model.choices.some((choice) => choice.kind === kind && !choice.disabled)
		)
			return;
		const selection = this.#selection;
		if (selection.mode === "replace") {
			if (this.session.replace(selection.selected, kind))
				this.#selection = inspect(selection.selected);
		} else if (
			selection.selected !== null &&
			quoteConstruction(this.session.snapshot(), selection.selected, kind)
		) {
			if (this.session.build(selection.selected, kind))
				this.#selection = inspect(selection.selected);
		} else this.#selection = { mode: "build", kind, selected: null };
		this.#message = "";
	}
	act(id: ConstructionAction): void {
		const model = this.present();
		if (
			![...model.actions, ...(model.launch ? [model.launch] : [])].some(
				(action) => action.id === id && !action.disabled,
			)
		)
			return;
		const selection = this.#selection,
			cell = selection.selected;
		this.#message = "";
		switch (id) {
			case "cancel":
				this.#selection = inspect();
				break;
			case "improve":
				if (cell !== null) this.session.improve(cell);
				break;
			case "sell":
				if (cell !== null && this.session.sell(cell))
					this.#selection = inspect();
				break;
			case "move":
				if (cell !== null)
					this.#selection = { mode: "move", movingFrom: cell, selected: null };
				break;
			case "replace":
				if (cell !== null)
					this.#selection = { mode: "replace", selected: cell };
				break;
			case "startWave":
				if (this.session.startWave()) this.#selection = inspect();
				break;
			case "portalBack":
				this.#selection = { mode: "portalIn", selected: null };
				break;
			case "placeWorld":
				if (cell === null) break;
				if (selection.mode === "snow" && this.session.placeSnow(cell))
					this.#selection = inspect();
				else if (selection.mode === "portalIn")
					this.#selection = {
						mode: "portalOut",
						entrance: cell,
						selected: null,
					};
				else if (
					selection.mode === "portalOut" &&
					this.session.placePortal(selection.entrance, cell)
				)
					this.#selection = inspect();
		}
	}
	selectWorld(kind: "snow" | "portal"): void {
		const state = this.session.snapshot();
		this.#sync(state);
		if (
			state.phase !== "prepare" ||
			(state.pendingWorld && state.pendingWorld !== kind)
		)
			return;
		if (kind === "snow" ? !state.bonuses.snowfall : !state.bonuses.portal)
			return;
		this.#selection = {
			mode: kind === "snow" ? "snow" : "portalIn",
			selected: null,
		};
		this.#message = "";
	}
	showDescription(message: string): void {
		this.#message = message;
	}
}
