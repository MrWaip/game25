import type { DefenseAssets } from "./assets";
import { extensionHeight } from "./board";
import type { UiNode, ButtonDrag } from "@/render/ui/types";
import type { Point } from "@/primitives/spatial";
import { DragPreview } from "@/render/ui/dragPreview";
import { PointerGesture } from "@/render/ui/pointerGesture";
import { portrait } from "./canvasUi";
import { theme } from "./theme";
import { boardWidth, boardHeight } from "./board";
import { towers } from "./definitions/towers";
import type { TowerKind } from "./model";
import type { DefenseSnapshot } from "./session";
export type PlacementPreview = {
	slot: number;
	kind: TowerKind;
	valid: boolean;
};

/** Radius in board units a drop may miss a pad by. */
export const dropRadius = 30;
/** The pad a drop lands on: the closest one in range, never merely the first. */
export function nearestSite(sites: readonly Point[], point: Point): number {
	let best = -1;
	let bestDistance = dropRadius * dropRadius;
	for (const [index, site] of sites.entries()) {
		const dx = site.x - point.x,
			dy = site.y - point.y,
			distance = dx * dx + dy * dy;
		if (distance <= bestDistance) {
			best = index;
			bestDistance = distance;
		}
	}
	return best;
}

export class BoardInput {
	private active = true;
	private gesture: PointerGesture;
	private ghost: DragPreview;
	private art: (kind: TowerKind) => UiNode;
	constructor(
		private board: HTMLElement,
		private viewport: HTMLElement,
		assets: DefenseAssets,
		private actions: {
			state(): DefenseSnapshot;
			preview(value: PlacementPreview | null): void;
			build(slot: number, kind: TowerKind): void;
			move(from: number, to: number): void;
			select(slot: number): void;
			selling(slot: number | null, hovered: boolean): void;
			saleContains(x: number, y: number): boolean;
			sell(slot: number): void;
		},
	) {
		this.ghost = new DragPreview({
			background: theme.panel,
			valid: theme.green,
			invalid: theme.red,
		});
		this.ghost.canvas.className = "td-drag-preview";
		viewport.parentElement?.append(this.ghost.canvas);
		this.art = (kind) => portrait(assets, towers[kind].sprite);
		this.gesture = new PointerGesture(board, (x, y) => {
			if (!this.active) return null;
			const from = this.cellAt(x, y),
				tower = actions.state().towers.find((t) => t.slot === from);
			if (!tower) return null;
			return {
				move: (x, y, dragging) => {
					if (!dragging) return;
					actions.selling(from, actions.saleContains(x, y));
					const slot = this.cellAt(x, y),
						valid = actions.saleContains(x, y) || (slot >= 0 && slot !== from);
					actions.preview({ slot, kind: tower.kind, valid });
					this.ghost.show(this.art(tower.kind), valid, x, y);
				},
				end: (x, y, dragging) => {
					const selling = dragging && actions.saleContains(x, y);
					this.cancel();
					const slot = this.cellAt(x, y);
					if (!dragging) actions.select(from);
					else if (selling) actions.sell(from);
					else if (slot >= 0 && slot !== from) actions.move(from, slot);
				},
				cancel: () => this.clearPreview(),
			};
		});
	}
	set enabled(value: boolean) {
		this.active = value;
		if (!value) this.cancel();
	}
	private cellAt(clientX: number, clientY: number): number {
		const view = this.viewport.getBoundingClientRect();
		if (
			clientX < view.left ||
			clientX > view.right ||
			clientY < view.top ||
			clientY > view.bottom
		)
			return -1;
		const rect = this.board.getBoundingClientRect(),
			state = this.actions.state(),
			top = -(state.level - 1) * extensionHeight;
		const point = {
			x: ((clientX - rect.left) / rect.width) * boardWidth,
			y: ((clientY - rect.top) / rect.height) * (boardHeight - top) + top,
		};
		return nearestSite(state.sites, point);
	}
	private valid(slot: number, kind: TowerKind): boolean {
		const state = this.actions.state();
		return (
			this.active &&
			state.phase === "wave" &&
			slot >= 0 &&
			!state.towers.some((t) => t.slot === slot) &&
			state.coins >= towers[kind].price
		);
	}
	dragTower(kind: TowerKind): ButtonDrag {
		return {
			move: (clientX, clientY) => {
				if (!this.active) return;
				const slot = this.cellAt(clientX, clientY),
					valid = this.valid(slot, kind);
				this.actions.preview({ slot, kind, valid });
				this.ghost.show(this.art(kind), valid, clientX, clientY);
			},
			drop: (clientX, clientY) => {
				const slot = this.cellAt(clientX, clientY);
				this.cancel();
				if (this.valid(slot, kind)) this.actions.build(slot, kind);
			},
			cancel: () => this.cancel(),
		};
	}
	private clearPreview() {
		this.ghost.hide();
		this.actions.selling(null, false);
		this.actions.preview(null);
	}
	cancel() {
		this.gesture.cancel();
		this.clearPreview();
	}
	destroy() {
		this.gesture.destroy();
		this.ghost.canvas.remove();
	}
}
