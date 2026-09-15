import { CanvasUi } from "@/render/ui/canvasUi";
import {
	contains,
	type ButtonDrag,
	type UiAppearance,
	type UiNode,
} from "@/render/ui/types";

// Browser adapter: DPR, pointer capture and a semantic mirror. Layout and visuals
// come entirely from CanvasUi; the transparent buttons provide native accessibility.
export class CanvasUiHost {
	readonly canvas = document.createElement("canvas");
	#ui: CanvasUi;
	#semantic = document.createElement("div");
	#scene: UiNode | null = null;
	#width = 0;
	#height = 0;
	#pointer: number | null = null;
	#origin = { x: 0, y: 0 };
	#dragged = false;
	#drag: ButtonDrag | undefined;
	#observer: ResizeObserver;
	#dispose: (() => void)[] = [];
	#semanticDispose: (() => void)[] = [];
	#destroyed = false;
	#enabled = true;
	constructor(
		private readonly root: HTMLElement,
		appearance: UiAppearance,
	) {
		const ctx = this.canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D is unavailable");
		this.#ui = new CanvasUi(
			ctx,
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
		const point = (event: PointerEvent) => {
			const bounds = this.canvas.getBoundingClientRect();
			return {
				x: ((event.clientX - bounds.left) * this.#width) / bounds.width,
				y: ((event.clientY - bounds.top) * this.#height) / bounds.height,
			};
		};
		listen("pointerdown", (event) => {
			const e = event as PointerEvent;
			if (
				!this.#enabled ||
				this.#pointer !== null ||
				!e.isPrimary ||
				e.button !== 0
			)
				return;
			this.#pointer = e.pointerId;
			this.#origin = point(e);
			this.#drag = this.#ui.buttons.find(
				({ node, rect }) =>
					!node.disabled && contains(rect, this.#origin.x, this.#origin.y),
			)?.node.drag;
			this.#dragged = false;
			root.setPointerCapture(e.pointerId);
			this.#ui.pointer("down", this.#origin.x, this.#origin.y);
			this.draw();
		});
		listen("pointermove", (event) => {
			const e = event as PointerEvent;
			if (
				!e.isPrimary ||
				(this.#pointer !== null && this.#pointer !== e.pointerId)
			)
				return;
			const p = point(e);
			if (
				this.#pointer !== null &&
				Math.hypot(p.x - this.#origin.x, p.y - this.#origin.y) > 10
			) {
				this.#dragged = true;
				this.#ui.cancel();
			}
			if (this.#dragged) this.#drag?.move(e.clientX, e.clientY);
			else this.#ui.pointer("move", p.x, p.y);
			this.draw();
		});
		listen("pointerup", (event) => {
			const e = event as PointerEvent;
			if (this.#pointer !== e.pointerId) return;
			this.#pointer = null;
			const p = point(e);
			const drag = this.#drag;
			this.#drag = undefined;
			if (this.#dragged) drag?.drop(e.clientX, e.clientY);
			else this.#ui.pointer("up", p.x, p.y);
			if (root.hasPointerCapture(e.pointerId))
				root.releasePointerCapture(e.pointerId);
			this.#dragged = false;
			if (e.pointerType === "touch") this.#ui.cancel();
			this.draw();
		});
		for (const type of ["pointercancel", "lostpointercapture", "pointerleave"])
			listen(type, () => {
				if (
					type === "pointerleave" &&
					this.#pointer !== null &&
					root.hasPointerCapture(this.#pointer)
				)
					return;
				this.#drag?.cancel();
				this.#drag = undefined;
				this.#pointer = null;
				this.#dragged = false;
				this.#ui.cancel();
				this.draw();
			});
		this.#observer = new ResizeObserver(() => this.#resize());
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
		if (!value) {
			this.#drag?.cancel();
			this.#drag = undefined;
			this.#dragged = false;
		}
		if (!value && this.#pointer !== null) {
			const pointer = this.#pointer;
			this.#pointer = null;
			if (this.root.hasPointerCapture(pointer))
				this.root.releasePointerCapture(pointer);
		}
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
		const ratio = Math.min(window.devicePixelRatio || 1, 3);
		if (
			!force &&
			width === this.#width &&
			this.canvas.width === Math.round(width * ratio)
		)
			return;
		this.#width = width;
		this.#ui.show(this.#scene, width, animate);
		this.#height = Math.max(1, Math.ceil(this.#ui.height));
		this.canvas.width = Math.round(width * ratio);
		this.canvas.height = Math.round(this.#height * ratio);
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
		const ctx = this.canvas.getContext("2d")!;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.scale(
			this.canvas.width / this.#width,
			this.canvas.height / this.#height,
		);
		this.#ui.draw();
		ctx.restore();
	}
	destroy(): void {
		this.enabled = false;
		this.#destroyed = true;
		this.#ui.cancel();
		this.#observer.disconnect();
		this.#dispose.forEach((dispose) => dispose());
		this.#semanticDispose.splice(0).forEach((dispose) => dispose());
		this.canvas.remove();
		this.#semantic.remove();
	}
}
