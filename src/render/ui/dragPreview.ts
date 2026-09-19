import { createCanvas } from "@/render/canvas";
import { CanvasSurface } from "@/render/surface";
import type { UiNode } from "./types";
export type DragPreviewAppearance = {
	background: string;
	valid: string;
	invalid: string;
};

export class DragPreview {
	readonly canvas = createCanvas();
	#surface = new CanvasSurface(this.canvas);
	constructor(private readonly appearance: DragPreviewAppearance) {
		this.canvas.style.cssText =
			"position:fixed;width:48px;height:48px;pointer-events:none;z-index:20;display:none";
		this.canvas.setAttribute("aria-hidden", "true");
	}
	show(art: UiNode, valid: boolean, clientX: number, clientY: number): void {
		this.canvas.style.display = "block";
		this.canvas.style.left = `${clientX - 24}px`;
		this.canvas.style.top = `${clientY - 36}px`;
		this.#surface.resize(
			{ width: 48, height: 48 },
			window.devicePixelRatio || 1,
		);
		this.#surface.frame((ctx) => {
			ctx.fillStyle = this.appearance.background;
			ctx.strokeStyle = valid ? this.appearance.valid : this.appearance.invalid;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(2, 2, 44, 44, 8);
			ctx.fill();
			ctx.stroke();
			if (art.kind === "drawing")
				art.draw(ctx, { x: 0, y: 7, width: 48, height: 30 });
		});
	}
	hide(): void {
		this.canvas.style.display = "none";
	}
}
