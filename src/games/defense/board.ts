export const grid = {
	columns: 11,
	rows: 15,
	cell: 48,
	width: 528,
	height: 720,
};
export const slots = Array.from(
	{ length: grid.columns * grid.rows },
	(_, i) => ({
		x: ((i % grid.columns) + 0.5) * grid.cell,
		y: (Math.floor(i / grid.columns) + 0.5) * grid.cell,
	}),
);
type Point = { x: number; y: number };
export type DefenseMap = { columns: number; rows: number; paths: Point[][] };
export function gridFor(map: Pick<DefenseMap, "columns" | "rows">) {
	return {
		columns: map.columns,
		rows: map.rows,
		cell: grid.cell,
		width: map.columns * grid.cell,
		height: map.rows * grid.cell,
	};
}
const layouts = new Map<string, Point[]>();
export function slotsFor(
	map: Pick<DefenseMap, "columns" | "rows">,
): readonly Point[] {
	const key = `${map.columns}:${map.rows}`;
	let cells = layouts.get(key);
	if (!cells) {
		cells = Array.from({ length: map.columns * map.rows }, (_, i) => ({
			x: ((i % map.columns) + 0.5) * grid.cell,
			y: (Math.floor(i / map.columns) + 0.5) * grid.cell,
		}));
		layouts.set(key, cells);
	}
	return cells;
}

/** Original map, retained for saves predating generated maps and fixed scenarios. */
export const classicMap: DefenseMap = {
	columns: 7,
	rows: 10,
	paths: [
		[
			{ x: 24, y: 0 },
			{ x: 24, y: 120 },
			{ x: 312, y: 120 },
			{ x: 312, y: 264 },
			{ x: 24, y: 264 },
			{ x: 24, y: 408 },
			{ x: 312, y: 408 },
			{ x: 312, y: 480 },
		],
	],
};

export function routeLength(map: DefenseMap, path = 0): number {
	const route = map.paths[path];
	return route
		.slice(1)
		.reduce(
			(length, p, i) => length + Math.hypot(p.x - route[i].x, p.y - route[i].y),
			0,
		);
}
export function validCell(map: DefenseMap, cell: number): boolean {
	return Number.isInteger(cell) && cell >= 0 && cell < map.columns * map.rows;
}
export function roadProgress(
	map: DefenseMap,
	cell: number,
	path?: number,
): number | null {
	if (!validCell(map, cell)) return null;
	const p = slotsFor(map)[cell];
	for (const route of path === undefined ? map.paths : [map.paths[path]]) {
		let progress = 0;
		for (let i = 1; i < route.length; i++) {
			const a = route[i - 1],
				b = route[i];
			if (
				p.x >= Math.min(a.x, b.x) &&
				p.x <= Math.max(a.x, b.x) &&
				p.y >= Math.min(a.y, b.y) &&
				p.y <= Math.max(a.y, b.y)
			)
				return progress + Math.hypot(p.x - a.x, p.y - a.y);
			progress += Math.hypot(b.x - a.x, b.y - a.y);
		}
	}
	return null;
}
/** Shortest distance from a cell center to any route segment. */
export function distanceToRoad(map: DefenseMap, cell: number): number {
	if (!validCell(map, cell)) return Infinity;
	const p = slotsFor(map)[cell];
	let distance = Infinity;
	for (const route of map.paths) {
		for (let i = 1; i < route.length; i++) {
			const a = route[i - 1],
				b = route[i];
			const x = Math.max(Math.min(a.x, b.x), Math.min(p.x, Math.max(a.x, b.x)));
			const y = Math.max(Math.min(a.y, b.y), Math.min(p.y, Math.max(a.y, b.y)));
			distance = Math.min(distance, Math.hypot(p.x - x, p.y - y));
		}
	}
	return distance;
}
export const isBuildable = (map: DefenseMap, cell: number) =>
	validCell(map, cell) && roadProgress(map, cell) === null;
export function pointOnRoute(map: DefenseMap, progress: number, path = 0) {
	const route = map.paths[path];
	let left = Math.max(0, Math.min(progress, routeLength(map, path)));
	for (let i = 1; i < route.length; i++) {
		const length = Math.hypot(
			route[i].x - route[i - 1].x,
			route[i].y - route[i - 1].y,
		);
		if (left <= length)
			return {
				x: route[i - 1].x + ((route[i].x - route[i - 1].x) * left) / length,
				y: route[i - 1].y + ((route[i].y - route[i - 1].y) * left) / length,
				segment: i,
			};
		left -= length;
	}
	return { ...route[route.length - 1], segment: route.length - 1 };
}

/** Validate stored geometry independently of the current generator. */
export function validMap(value: unknown): value is DefenseMap {
	if (
		!value ||
		typeof value !== "object" ||
		!("columns" in value) ||
		!("rows" in value) ||
		!Number.isSafeInteger(value.columns) ||
		!Number.isSafeInteger(value.rows) ||
		Number(value.columns) < 4 ||
		Number(value.columns) > 24 ||
		Number(value.rows) < 4 ||
		Number(value.rows) > 24 ||
		!("paths" in value) ||
		!Array.isArray(value.paths) ||
		value.paths.length < 1 ||
		value.paths.length > 16
	)
		return false;
	const size = gridFor(value as DefenseMap);
	const cells = slotsFor(value as DefenseMap);
	const edges = new Map<string, Set<string>>();
	let base = "";
	const key = (p: Point) => `${p.x},${p.y}`;
	for (const route of value.paths) {
		if (!Array.isArray(route) || route.length < 2 || route.length > 64)
			return false;
		for (const [i, p] of route.entries()) {
			if (
				!p ||
				typeof p !== "object" ||
				!Number.isFinite(p.x) ||
				!Number.isFinite(p.y) ||
				p.x < 24 ||
				p.x > size.width - 24 ||
				(p.x - 24) % grid.cell !== 0 ||
				p.y < 0 ||
				p.y > size.height
			)
				return false;
			if (
				i === 0
					? p.y !== 0
					: i === route.length - 1
						? p.y !== size.height
						: (p.y - 24) % grid.cell !== 0
			)
				return false;
			if (i === 0) continue;
			const a = route[i - 1];
			if ((a.x === p.x) === (a.y === p.y)) return false;
			// Include every crossed cell, so junctions inside long segments count too.
			const crossed = cells.filter(
				(s) =>
					s.x >= Math.min(a.x, p.x) &&
					s.x <= Math.max(a.x, p.x) &&
					s.y >= Math.min(a.y, p.y) &&
					s.y <= Math.max(a.y, p.y),
			);
			const points = [a, ...crossed, p].sort(
				(u, v) =>
					Math.hypot(u.x - a.x, u.y - a.y) - Math.hypot(v.x - a.x, v.y - a.y),
			);
			for (let j = 1; j < points.length; j++) {
				const from = key(points[j - 1]),
					to = key(points[j]);
				if (from === to) continue;
				if (!edges.has(from)) edges.set(from, new Set());
				edges.get(from)!.add(to);
			}
		}
		const end = key(route[route.length - 1]);
		if (base && base !== end) return false;
		base = end;
	}
	const visiting = new Set<string>(),
		visited = new Set<string>();
	const acyclic = (node: string): boolean => {
		if (visiting.has(node)) return false;
		if (visited.has(node)) return true;
		visiting.add(node);
		for (const next of edges.get(node) ?? []) if (!acyclic(next)) return false;
		visiting.delete(node);
		visited.add(node);
		return true;
	};
	return (
		[...edges.keys()].every(acyclic) &&
		cells.filter((_, cell) => isBuildable(value as DefenseMap, cell)).length >=
			10
	);
}
