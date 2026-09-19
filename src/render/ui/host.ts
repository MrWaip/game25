import { PointerGesture } from "./pointerGesture";
import { createCanvas } from "@/render/canvas";
import { CanvasSurface } from "@/render/surface";
import { clientPoint } from "@/render/projection";
import { CanvasUi } from "@/render/ui/canvasUi";
import { contains, type UiAppearance, type UiNode } from "@/render/ui/types";

// Browser adapter: DPR, pointer capture and a semantic mirror. Layout and visuals
// come entirely from CanvasUi; the transparent buttons provide native accessibility.
export class CanvasUiHost {
	readonly canvas = createCanvas();
	#surface = new CanvasSurface(this.canvas);
	#ratio = 0;
	#ui: CanvasUi;
	#semantic = document.createElement("div");
	#scene: UiNode | null = null;
	#width = 0;
	#height = 0;
	#gesture: PointerGesture;
	#observer: ResizeObserver;
	#resizeFrame: number | undefined;
	#dispose: (() => void)[] = [];
	#semanticDispose: (() => void)[] = [];
	#destroyed = false;
	#enabled = true;
	constructor(
		private readonly root: HTMLElement,
		appearance: UiAppearance,
	) {
		this.#ui = new CanvasUi(
			(text, font) => this.#surface.measureText(text, font),
			appearance,
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		);
		this.canvas.setAttribute("aria-hidden", "true");
		this.canvas.style.cssText = "display:block;width:100%;touch-action:pan-y";
		this.#semantic.style.cssText =
			"position:absolute;inset:0;pointer-events:none";
		root.append(this.canvas, this.#semantic);
		const listen = (type: string, handler: EventListener) => {
			root.addEventListener(type, handler);
			this.#dispose.push(() => root.removeEventListener(type, handler));
		};
		const point = (x: number, y: number) =>
			this.#surface.point(clientPoint(x, y));
		this.#gesture = new PointerGesture(root, (x, y) => {
			if (!this.#enabled) return null;
			const origin = point(x, y);
			if (!origin) return null;
			const drag = this.#ui.buttons.find(
				({ node, rect }) =>
					!node.disabled && contains(rect, origin.x, origin.y),
			)?.node.drag;
			this.#ui.pointer("down", origin.x, origin.y);
			this.draw();
			return {
				move: (x, y, dragging) => {
					if (dragging) {
						this.#ui.cancel();
						drag?.move(x, y);
					} else {
						const p = point(x, y);
						if (p) this.#ui.pointer("move", p.x, p.y);
					}
					this.draw();
				},
				end: (x, y, dragging) => {
					const p = point(x, y);
					if (dragging) drag?.drop(x, y);
					else if (p) this.#ui.pointer("up", p.x, p.y);
					this.#ui.cancel();
					this.draw();
				},
				cancel: () => {
					drag?.cancel();
					this.#ui.cancel();
					this.draw();
				},
			};
		});
		const hover = (event: PointerEvent) => {
			if (!this.#enabled || this.#gesture.active || !event.isPrimary) return;
			const p = point(event.clientX, event.clientY);
			if (p) this.#ui.pointer("move", p.x, p.y);
			this.draw();
		};
		root.addEventListener("pointermove", hover);
		this.#dispose.push(() => root.removeEventListener("pointermove", hover));
		listen("pointerleave", () => {
			if (this.#gesture.active) return;
			this.#ui.cancel();
			this.draw();
		});
		// Layout changes the observed root's height. Defer writes until the next
		// frame instead of invalidating the current ResizeObserver delivery.
		this.#observer = new ResizeObserver(() => {
			if (this.#destroyed || this.#resizeFrame !== undefined) return;
			this.#resizeFrame = requestAnimationFrame(() => {
				this.#resizeFrame = undefined;
				this.#resize();
			});
		});
		this.#observer.observe(root);
		void document.fonts?.ready.then(() => {
			if (!this.#destroyed) {
				this.#ui.invalidateText();
				this.#resize(true);
			}
		});
	}
	set enabled(value: boolean) {
		this.#enabled = value;
		this.#ui.enabled = value;
		if (!value) this.#gesture.cancel();
		const buttons = new Map(
			this.#ui.buttons.map((item) => [item.node.id, item.node]),
		);
		for (const button of this.#semantic.querySelectorAll("button"))
			button.disabled = !value || !!buttons.get(button.dataset.uiId!)?.disabled;
		this.draw();
	}

	show(scene: UiNode, animate = true): void {
		this.#scene = scene;
		this.#resize(true, animate);
	}
	#resize(force = false, animate = false): void {
		if (!this.#scene || this.#destroyed) return;
		const width = this.root.clientWidth;
		if (width <= 0) return;
		const ratio = window.devicePixelRatio || 1;
		if (!force && width === this.#width && this.#ratio === ratio) return;
		this.#width = width;
		this.#ui.show(this.#scene, width, animate);
		this.#height = Math.max(1, Math.ceil(this.#ui.height));
		this.#ratio = ratio;
		this.#surface.resize({ width, height: this.#height }, ratio);
		this.canvas.style.height = `${this.#height}px`;
		const focused = document.activeElement?.getAttribute("data-ui-id");
		this.#semanticDispose.splice(0).forEach((dispose) => dispose());
		this.#semantic.replaceChildren();
		const description = document.createElement("span");
		description.style.cssText =
			"position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
		const collect = (node: UiNode): string =>
			node.kind === "text"
				? node.text
				: node.kind === "button" || node.kind === "drawing"
					? ""
					: node.children.map(collect).join(" ");
		description.textContent = collect(this.#scene);
		this.#semantic.append(description);
		for (const { node, rect } of this.#ui.buttons) {
			const button = document.createElement("button");
			button.type = "button";
			button.dataset.uiId = node.id;
			button.setAttribute("aria-label", node.label);
			if (node.pressed !== undefined)
				button.setAttribute("aria-pressed", String(node.pressed));
			if (node.description)
				button.setAttribute("aria-description", node.description);
			button.disabled = !this.#enabled || !!node.disabled;
			button.style.cssText = `position:absolute;opacity:0;pointer-events:auto;left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;margin:0;padding:0;min-height:0;border:0`;
			button.style.touchAction = node.drag ? "none" : "pan-y";
			const listen = (type: string, handler: EventListener) => {
				button.addEventListener(type, handler);
				this.#semanticDispose.push(() =>
					button.removeEventListener(type, handler),
				);
			};
			listen("focus", () => {
				this.#ui.focus(node.id);
				this.draw();
			});
			listen("blur", () => {
				this.#ui.focus(null);
				this.draw();
			});
			listen("click", (event) => {
				if ((event as MouseEvent).detail === 0) {
					this.#ui.activate(node.id);
					this.draw();
				}
			});
			this.#semantic.append(button);
			if (focused === node.id) button.focus({ preventScroll: true });
		}
		this.draw();
	}
	advance(dt: number): void {
		this.#ui.advance(dt);
		this.draw();
	}
	draw(): void {
		if (this.#destroyed || !this.#width) return;
		this.#surface.frame((ctx) => {
			this.#ui.draw(ctx);
		});
	}
	destroy(): void {
		this.enabled = false;
		this.#gesture.destroy();
		this.#destroyed = true;
		this.#ui.cancel();
		this.#observer.disconnect();
		if (this.#resizeFrame !== undefined)
			cancelAnimationFrame(this.#resizeFrame);
		this.#dispose.forEach((dispose) => dispose());
		this.#semanticDispose.splice(0).forEach((dispose) => dispose());
		this.canvas.remove();
		this.#semantic.remove();
	}
}
