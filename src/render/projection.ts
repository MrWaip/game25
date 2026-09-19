export type Size = Readonly<{ width: number; height: number }>;
export type Rect = Size & Readonly<{ x: number; y: number }>;
type Point<Space extends string> = Readonly<{
	x: number;
	y: number;
	space: Space;
}>;
export type WorldPoint = Point<"world">;
export type ScreenPoint = Point<"screen">;
export type ClientPoint = Point<"client">;
export const worldPoint = (x: number, y: number): WorldPoint => ({
	x,
	y,
	space: "world",
});
export const screenPoint = (x: number, y: number): ScreenPoint => ({
	x,
	y,
	space: "screen",
});
export const clientPoint = (x: number, y: number): ClientPoint => ({
	x,
	y,
	space: "client",
});

export function positive(value: number, name: string): number {
	if (!Number.isFinite(value) || value <= 0)
		throw new RangeError(`${name} must be finite and positive`);
	return value;
}

/** World units ↔ logical screen pixels. DPR belongs exclusively to CanvasSurface. */
export class Projection {
	readonly viewport: Size;
	readonly bounds: Rect;
	readonly scaleX: number;
	readonly scaleY: number;
	constructor(
		viewport: Size,
		bounds: Rect,
		private readonly yAxis: "up" | "down",
	) {
		positive(viewport.width, "viewport width");
		positive(viewport.height, "viewport height");
		positive(bounds.width, "world width");
		positive(bounds.height, "world height");
		if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y))
			throw new RangeError("World origin must be finite");
		this.viewport = Object.freeze({ ...viewport });
		this.bounds = Object.freeze({ ...bounds });
		this.scaleX = viewport.width / bounds.width;
		this.scaleY = viewport.height / bounds.height;
	}
	toScreen(point: WorldPoint): ScreenPoint {
		return screenPoint(
			(point.x - this.bounds.x) * this.scaleX,
			(this.yAxis === "up"
				? this.bounds.y + this.bounds.height - point.y
				: point.y - this.bounds.y) * this.scaleY,
		);
	}
	toWorld(point: ScreenPoint): WorldPoint {
		return worldPoint(
			this.bounds.x + point.x / this.scaleX,
			this.yAxis === "up"
				? this.bounds.y + this.bounds.height - point.y / this.scaleY
				: this.bounds.y + point.y / this.scaleY,
		);
	}
}

/** Returns null for hidden/unmeasured canvases; never invents a hit at (0, 0). */
export function clientToScreen(
	point: ClientPoint,
	bounds: Rect,
	viewport: Size,
): ScreenPoint | null {
	if (bounds.width <= 0 || bounds.height <= 0) return null;
	return screenPoint(
		((point.x - bounds.x) * viewport.width) / bounds.width,
		((point.y - bounds.y) * viewport.height) / bounds.height,
	);
}
