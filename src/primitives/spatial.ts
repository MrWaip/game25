import { Vec2 } from "@/primitives/vec2-gl";

export type Point = Readonly<{ x: number; y: number }>;

/** Inclusive circular query, independent of game entities and ECS storage. */
export function* withinRadius<T>(
	items: Iterable<T>,
	center: Point,
	radius: number,
	position: (item: T) => Point,
): Generator<T> {
	const origin: Vec2 = [center.x, center.y];
	const point = Vec2.create();
	for (const item of items) {
		const value = position(item);
		Vec2.set(point, value.x, value.y);
		if (Vec2.squaredDistance(origin, point) <= radius * radius) yield item;
	}
}

export function distanceBetween(a: Point, b: Point): number {
	return Vec2.distance([a.x, a.y], [b.x, b.y]);
}

/** Position along a segment, displaced by a signed perpendicular distance. */
export function offsetFromSegment(
	start: Point,
	end: Point,
	fraction: number,
	offset: number,
): Point {
	const point = interpolatePoint(start, end, fraction);
	const length = distanceBetween(start, end);
	if (length === 0) return point;
	return {
		x: point.x - ((end.y - start.y) / length) * offset,
		y: point.y + ((end.x - start.x) / length) * offset,
	};
}

export function interpolatePoint(a: Point, b: Point, fraction: number): Point {
	const result = Vec2.lerp(Vec2.create(), [a.x, a.y], [b.x, b.y], fraction);
	return { x: result[0], y: result[1] };
}

/** A parabola above the straight path, with its apex halfway through flight. */
export function arcPoint(
	a: Point,
	b: Point,
	fraction: number,
	height: number,
): Point {
	const point = interpolatePoint(a, b, fraction);
	return { x: point.x, y: point.y - 4 * height * fraction * (1 - fraction) };
}
