import type { PlacementPreview } from "@/games/defense/interaction/model";
import { DragPreview } from "@/games/defense/dragPreview";
import type { DefenseRenderer } from "@/games/defense/renderer";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { TowerKind } from "@/games/defense/config";
import type { ButtonDrag } from "@/render/ui/types";
import {
	canRelocate,
	quoteConstruction,
} from "@/games/defense/constructionRules";

/** Board gestures keep the saved world unchanged until a valid drop. */
export class BoardInput {
	#enabled = true;
	#press: {
		id: number;
		x: number;
		y: number;
		from: number;
		dragging: boolean;
	} | null = null;
	#ghost = new DragPreview();
	constructor(
		private readonly board: HTMLElement,
		private readonly renderer: Pick<DefenseRenderer, "cellAt">,
		private readonly actions: {
			state(): DefenseSnapshot;
			preview(placement: PlacementPreview | null): void;
			tap(cell: number): void;
			move(from: number, to: number): void;
			build(cell: number, kind: TowerKind): void;
		},
	) {
		board.append(this.#ghost.canvas);
		board.onpointerdown = (event) => {
			if (!this.#enabled || !event.isPrimary || event.button !== 0) return;
			this.#press = {
				id: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				from: this.#cell(event),
				dragging: false,
			};
			board.setPointerCapture(event.pointerId);
		};
		board.onpointermove = (event) => {
			const press = this.#press;
			if (!press || press.id !== event.pointerId) return;
			if (
				Math.hypot(event.clientX - press.x, event.clientY - press.y) < 8 &&
				!press.dragging
			)
				return;
			press.dragging = true;
			const state = actions.state();
			const tower = state.towers.find((tower) => tower.slot === press.from);
			if (state.phase !== "prepare" || state.pendingWorld || !tower) return;
			const valid = canRelocate(state, press.from, this.#cell(event));
			this.#preview(tower.kind, valid, event.clientX, event.clientY);
		};
		board.onpointerup = (event) => {
			const press = this.#press;
			const target = this.#cell(event);
			this.cancel();
			if (!press || press.id !== event.pointerId) return;
			if (!press.dragging) actions.tap(target);
			else {
				const state = actions.state();
				if (!state.pendingWorld && canRelocate(state, press.from, target))
					actions.move(press.from, target);
			}
		};
		board.onpointercancel = () => this.cancel();
		board.onlostpointercapture = () => this.cancel();
	}
	set enabled(value: boolean) {
		this.#enabled = value;
		if (!value) this.cancel();
	}
	dragTower(kind: TowerKind): ButtonDrag {
		const valid = (cell: number) => {
			const state = this.actions.state();
			return (
				this.#enabled &&
				!state.pendingWorld &&
				!!quoteConstruction(state, cell, kind)
			);
		};
		return {
			move: (clientX, clientY) => {
				if (this.#enabled)
					this.#preview(
						kind,
						valid(this.#cell({ clientX, clientY })),
						clientX,
						clientY,
					);
			},
			drop: (clientX, clientY) => {
				this.cancel();
				const cell = this.#cell({ clientX, clientY });
				if (valid(cell)) this.actions.build(cell, kind);
			},
			cancel: () => this.cancel(),
		};
	}
	#preview(
		kind: TowerKind,
		valid: boolean,
		clientX: number,
		clientY: number,
	): void {
		this.actions.preview({
			kind,
			from: this.#press?.from ?? null,
			hover: this.#cell({ clientX, clientY }),
		});
		this.#ghost.show(kind, valid, clientX, clientY);
	}

	#cell(event: { clientX: number; clientY: number }): number {
		return this.renderer.cellAt(event.clientX, event.clientY);
	}

	cancel(): void {
		const press = this.#press;
		this.#press = null;
		this.#ghost.hide();
		this.actions.preview(null);
		if (press && this.board.hasPointerCapture(press.id))
			this.board.releasePointerCapture(press.id);
	}
	destroy(): void {
		this.cancel();
		this.#ghost.canvas.remove();
		this.board.onpointerdown =
			this.board.onpointermove =
			this.board.onpointerup =
			this.board.onpointercancel =
			this.board.onlostpointercapture =
				null;
	}
}
