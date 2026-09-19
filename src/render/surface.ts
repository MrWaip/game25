import {
	clientToScreen,
	positive,
	type ClientPoint,
	type ScreenPoint,
	type Size,
} from "@/render/projection";
import type { CanvasElement } from "@/render/canvas";

/** Painters can transform locally, but cannot replace the frame transform or resize its canvas. */
export type PaintContext = Omit<
	CanvasRenderingContext2D,
	"canvas" | "reset" | "resetTransform" | "setTransform"
>;

/** Sole owner of the native context, backing buffer and DPR transform. */
export class CanvasSurface {
	#ctx: CanvasRenderingContext2D;
	#size: Size = { width: 1, height: 1 };
	#painting = false;
	private readonly canvas: HTMLCanvasElement;
	constructor(canvas: CanvasElement) {
		this.canvas = canvas as HTMLCanvasElement;
		const ctx = this.canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D is unavailable");
		this.#ctx = ctx;
	}
	resize(size: Size, pixelRatio: number): void {
		positive(pixelRatio, "pixel ratio");
		this.resizeBuffer(size, {
			width: size.width * pixelRatio,
			height: size.height * pixelRatio,
		});
	}
	/** Keep world coordinates while matching the Canvas's actual CSS size and screen density. */
	resizeToDisplay(size: Size, pixelRatio: number): void {
		positive(pixelRatio, "pixel ratio");
		const rect = this.canvas.getBoundingClientRect();
		this.resizeBuffer(size, {
			width: (rect.width || size.width) * pixelRatio,
			height: (rect.height || size.height) * pixelRatio,
		});
	}
	private resizeBuffer(size: Size, pixels: Size): void {
		if (this.#painting) throw new Error("Cannot resize during a frame");
		positive(size.width, "width");
		positive(size.height, "height");
		const width = Math.max(1, Math.round(pixels.width));
		const height = Math.max(1, Math.round(pixels.height));
		this.#size = { ...size };
		if (this.canvas.width !== width) this.canvas.width = width;
		if (this.canvas.height !== height) this.canvas.height = height;
	}

	#layers = new Map<string, HTMLCanvasElement>();
	layer(
		key: string,
		size: Size,
		paint: (ctx: PaintContext) => void,
	): CanvasImageSource {
		const scale = this.canvas.width / this.#size.width;
		const width = Math.max(1, Math.round(size.width * scale)),
			height = Math.max(1, Math.round(size.height * scale));
		const id = `${key}:${width}x${height}`;
		const cached = this.#layers.get(id);
		if (cached) return cached;
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D is unavailable");
		ctx.setTransform(scale, 0, 0, scale, 0, 0);
		paint(ctx);
		this.#layers.clear();
		this.#layers.set(id, canvas);
		return canvas;
	}
	point(point: ClientPoint): ScreenPoint | null {
		return clientToScreen(
			point,
			this.canvas.getBoundingClientRect(),
			this.#size,
		);
	}
	measureText(text: string, font: string): number {
		this.#ctx.save();
		try {
			this.#ctx.font = font;
			return this.#ctx.measureText(text).width;
		} finally {
			this.#ctx.restore();
		}
	}
	frame(paint: (ctx: PaintContext) => undefined): void {
		if (this.#painting) throw new Error("Cannot nest canvas frames");
		const ctx = this.#ctx;
		ctx.reset();
		ctx.save();
		this.#painting = true;
		let open = true;
		const assertOpen = () => {
			if (!open) throw new Error("Frame is closed");
		};
		const methods = new Map<PropertyKey, unknown>();
		const scoped = new Proxy(ctx, {
			get(target, key) {
				assertOpen();
				if (
					["canvas", "reset", "resetTransform", "setTransform"].includes(
						String(key),
					)
				)
					throw new Error("CanvasSurface owns frame configuration");
				const value = Reflect.get(target, key, target);
				if (typeof value !== "function") return value;
				if (!methods.has(key))
					methods.set(key, (...args: unknown[]) => {
						assertOpen();
						return Reflect.apply(value, target, args);
					});
				return methods.get(key);
			},
			set(target, key, value) {
				assertOpen();
				return Reflect.set(target, key, value, target);
			},
		});
		try {
			ctx.setTransform(
				this.canvas.width / this.#size.width,
				0,
				0,
				this.canvas.height / this.#size.height,
				0,
				0,
			);
			paint(scoped);
		} finally {
			open = false;
			ctx.restore();
			this.#painting = false;
		}
	}
}
