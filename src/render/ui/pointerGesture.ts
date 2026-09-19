import { distanceBetween } from "@/primitives/spatial";

export type PointerGestureHandlers = {
	move(x: number, y: number, dragging: boolean): void;
	end(x: number, y: number, dragging: boolean): void;
	cancel(): void;
};
type Press = {
	pointer: number;
	x: number;
	y: number;
	dragging: boolean;
	handlers: PointerGestureHandlers;
};

/** Shared pointer capture, drag threshold and cancellation for Canvas controls and scenes. */
export class PointerGesture {
	private press: Press | null = null;
	constructor(
		private root: HTMLElement,
		private begin: (x: number, y: number) => PointerGestureHandlers | null,
	) {
		root.addEventListener("pointerdown", this.down);
		root.addEventListener("pointermove", this.move);
		root.addEventListener("pointerup", this.up);
		root.addEventListener("pointercancel", this.cancel);
		root.addEventListener("lostpointercapture", this.cancel);
	}
	get active(): boolean {
		return this.press !== null;
	}
	private down = (event: PointerEvent) => {
		if (this.press || !event.isPrimary || event.button !== 0) return;
		const handlers = this.begin(event.clientX, event.clientY);
		if (!handlers) return;
		this.press = {
			pointer: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			dragging: false,
			handlers,
		};
		this.root.setPointerCapture(event.pointerId);
	};
	private move = (event: PointerEvent) => {
		const press = this.press;
		if (!press || press.pointer !== event.pointerId) return;
		if (distanceBetween(press, { x: event.clientX, y: event.clientY }) > 10)
			press.dragging = true;
		press.handlers.move(event.clientX, event.clientY, press.dragging);
	};
	private up = (event: PointerEvent) => {
		if (this.press?.pointer !== event.pointerId) return;
		const press = this.release();
		press?.handlers.end(event.clientX, event.clientY, press.dragging);
	};
	private release(): Press | null {
		const press = this.press;
		this.press = null;
		if (press && this.root.hasPointerCapture(press.pointer))
			this.root.releasePointerCapture(press.pointer);
		return press;
	}
	cancel = (): void => {
		this.release()?.handlers.cancel();
	};
	destroy(): void {
		this.cancel();
		this.root.removeEventListener("pointerdown", this.down);
		this.root.removeEventListener("pointermove", this.move);
		this.root.removeEventListener("pointerup", this.up);
		this.root.removeEventListener("pointercancel", this.cancel);
		this.root.removeEventListener("lostpointercapture", this.cancel);
	}
}
