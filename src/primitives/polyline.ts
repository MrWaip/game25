import { distanceBetween, interpolatePoint, type Point } from "./spatial";
type Segment = { start: Point; end: Point; offset: number; length: number };
/** Immutable route geometry; segment lengths are calculated once. */
export class Polyline {
	readonly length: number;
	private segments: Segment[] = [];
	constructor(readonly points: readonly Point[]) {
		let offset = 0;
		for (let i = 1; i < points.length; i++) {
			const start = points[i - 1],
				end = points[i],
				length = distanceBetween(start, end);
			if (length > 0) this.segments.push({ start, end, offset, length });
			offset += length;
		}
		this.length = offset;
	}
	pointAt(distance: number): Point {
		for (const segment of this.segments) {
			if (distance <= segment.offset + segment.length)
				return interpolatePoint(
					segment.start,
					segment.end,
					Math.max(0, distance - segment.offset) / segment.length,
				);
		}
		return this.points[this.points.length - 1] ?? { x: 0, y: 0 };
	}
}
