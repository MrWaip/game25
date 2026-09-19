import { createCanvas } from "@/render/canvas";
import { CanvasSurface } from "@/render/surface";
import { defenseTheme } from "@/games/defense/theme";
import { towerPortrait } from "@/games/defense/towerPortrait";
import type { TowerKind } from "@/games/defense/config";
import { theme } from "@/ui/theme";

export class DragPreview {
	readonly canvas = createCanvas();
	#surface = new CanvasSurface(this.canvas);
	constructor() {
		this.canvas.style.cssText =
			"position:fixed;width:48px;height:48px;pointer-events:none;z-index:20;display:none";
		this.canvas.setAttribute("aria-hidden", "true");
	}
	show(
		kind: TowerKind,
		valid: boolean,
		clientX: number,
		clientY: number,
	): void {
		this.canvas.style.display = "block";
		this.canvas.style.left = `${clientX - 24}px`;
		this.canvas.style.top = `${clientY - 36}px`;
		this.#surface.resize(
			{ width: 48, height: 48 },
			Math.min(window.devicePixelRatio || 1, 3),
		);
		this.#surface.frame((ctx) => {
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
		});
	}
	hide(): void {
		this.canvas.style.display = "none";
	}
}
