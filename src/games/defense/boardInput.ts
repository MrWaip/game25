import type { PlacementPreview } from "@/games/defense/interaction/model";
import { defenseTheme } from "@/games/defense/theme";
import type { DefenseSnapshot } from "@/games/defense/snapshot";
import type { TowerKind } from "@/games/defense/config";
import type { ButtonDrag } from "@/render/ui/types";
import {
	canRelocate,
	quoteConstruction,
} from "@/games/defense/constructionRules";
import { towerPortrait } from "@/games/defense/towerPortrait";
import { theme } from "@/ui/theme";

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
	#ghost = document.createElement("canvas");
	constructor(
		private readonly board: HTMLElement,
		private readonly canvas: HTMLCanvasElement,
		private readonly actions: {
			state(): DefenseSnapshot;
			preview(placement: PlacementPreview | null): void;
			tap(cell: number): void;
			move(from: number, to: number): void;
			build(cell: number, kind: TowerKind): void;
		},
	) {
		this.#ghost.width = this.#ghost.height = 96;
		this.#ghost.style.cssText =
			"position:fixed;width:48px;height:48px;pointer-events:none;z-index:20;display:none";
		this.#ghost.setAttribute("aria-hidden", "true");
		board.append(this.#ghost);
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
		this.#ghost.style.display = "block";
		this.#ghost.style.left = `${clientX - 24}px`;
		this.#ghost.style.top = `${clientY - 36}px`;
		const ctx = this.#ghost.getContext("2d")!;
		ctx.setTransform(2, 0, 0, 2, 0, 0);
		ctx.clearRect(0, 0, 48, 48);
		ctx.fillStyle = theme.ui.surface;
		ctx.strokeStyle = valid
			? defenseTheme.board.buildAllowed
			: defenseTheme.board.buildBlocked;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(2, 2, 44, 44, 8);
		ctx.fill();
		ctx.stroke();
		const portrait = towerPortrait(kind);
		if (portrait.kind === "drawing")
			portrait.draw(ctx, { x: 0, y: 7, width: 48, height: 30 });
	}

	#cell(event: { clientX: number; clientY: number }): number {
		const bounds = this.canvas.getBoundingClientRect();
		const map = this.actions.state().map;
		const col = Math.floor(
			((event.clientX - bounds.left) / bounds.width) * map.columns,
		);
		const row = Math.floor(
			((event.clientY - bounds.top) / bounds.height) * map.rows,
		);
		return col >= 0 && col < map.columns && row >= 0 && row < map.rows
			? row * map.columns + col
			: -1;
	}
	cancel(): void {
		const press = this.#press;
		this.#press = null;
		this.#ghost.style.display = "none";
		this.actions.preview(null);
		if (press && this.board.hasPointerCapture(press.id))
			this.board.releasePointerCapture(press.id);
	}
	destroy(): void {
		this.cancel();
		this.#ghost.remove();
		this.board.onpointerdown =
			this.board.onpointermove =
			this.board.onpointerup =
			this.board.onpointercancel =
			this.board.onlostpointercapture =
				null;
	}
}
