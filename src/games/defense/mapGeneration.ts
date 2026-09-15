import { Random } from "@/primitives/random";
import { grid, slots, validMap, type DefenseMap } from "@/games/defense/board";

const row = (cell: number) => Math.floor(cell / grid.columns);
const column = (cell: number) => cell % grid.columns;
const distance = (a: number, b: number) =>
	Math.abs(row(a) - row(b)) + Math.abs(column(a) - column(b));
const neighbors = (cell: number) =>
	[cell - grid.columns, cell + grid.columns, cell - 1, cell + 1].filter(
		(next) => next >= 0 && next < slots.length && distance(cell, next) === 1,
	);

/** Carve long straights with spaced turns, add entrances, then add detours between existing
 * junctions. Roads never head upward; complete paths have at most ten bends.
 * All decisions use a map-only stream; rewards and spawn choices are independent.
 */
export function generateMap(seed: string): DefenseMap {
	const random = new Random(seed).child("map:2");
	const shuffled = <T>(values: T[]): T[] => {
		for (let i = values.length - 1; i > 0; i--) {
			const j = random.int(0, i);
			[values[i], values[j]] = [values[j], values[i]];
		}
		return values;
	};
	function walk(
		start: number,
		goal: number,
		blocked: Set<number>,
		min: number,
		max: number,
	): number[] | null {
		const path = [start],
			visited = new Set([start]);
		let budget = 2400;
		const search = (
			cell: number,
			direction = 0,
			straight = 0,
			turns = 0,
		): boolean => {
			if (--budget < 0 || path.length + distance(cell, goal) > max)
				return false;
			if (cell === goal) return path.length >= min;
			const candidates = shuffled(neighbors(cell));
			if (random.next() < 0.75)
				candidates.sort(
					(a, b) =>
						Number(b - cell === direction) - Number(a - cell === direction),
				);
			for (const next of candidates) {
				if (
					row(next) < row(cell) ||
					visited.has(next) ||
					(next !== goal && blocked.has(next))
				)
					continue;
				const nextDirection = next - cell;
				const turning = direction !== 0 && nextDirection !== direction;
				if (turning && (straight < 2 || turns >= 6)) continue;
				visited.add(next);
				path.push(next);
				if (
					search(
						next,
						nextDirection,
						turning ? 1 : straight + 1,
						turns + Number(turning),
					)
				)
					return true;
				path.pop();
				visited.delete(next);
			}
			return false;
		};
		return search(start) ? path : null;
	}
	const rim = new Set(
		slots
			.map((_, cell) => cell)
			.filter((cell) => row(cell) === 0 || row(cell) === grid.rows - 1),
	);
	for (let attempt = 0; attempt < 100; attempt++) {
		const entranceColumns = shuffled(
			Array.from({ length: grid.columns }, (_, i) => i),
		);
		const base =
			(grid.rows - 1) * grid.columns + random.int(0, grid.columns - 1);
		const main = walk(entranceColumns[0], base, rim, random.int(22, 28), 34);
		if (!main) continue;
		const occupied = new Set(main);
		const edges = new Map<number, Set<number>>();
		const add = (path: number[]) => {
			for (let i = 1; i < path.length; i++) {
				if (!edges.has(path[i - 1])) edges.set(path[i - 1], new Set());
				edges.get(path[i - 1])!.add(path[i]);
			}
			path.forEach((cell) => occupied.add(cell));
		};
		add(main);
		const entrances = [main[0]];
		const entranceCount = random.int(2, 3);
		for (const entrance of entranceColumns.slice(1)) {
			if (entrances.length >= entranceCount) break;
			const joins = shuffled(main.slice(3, -4));
			for (const join of joins) {
				const path = walk(
					entrance,
					join,
					new Set([...rim, ...occupied]),
					4,
					15,
				);
				if (
					!path ||
					occupied.size + path.length - 1 > Math.floor(slots.length * 0.36)
				)
					continue;
				add(path);
				entrances.push(entrance);
				break;
			}
		}
		if (entrances.length < 2) continue;
		let forks = 0;
		const desiredForks = random.int(1, 2);
		for (const from of shuffled(main.slice(2, -5).map((_, i) => i + 2))) {
			if (forks >= desiredForks) break;
			for (const to of shuffled(
				main.slice(from + 3, -1).map((_, i) => from + 3 + i),
			)) {
				const path = walk(
					main[from],
					main[to],
					new Set([...rim, ...occupied]),
					4,
					14,
				);
				if (
					!path ||
					occupied.size + path.length - 2 > Math.floor(slots.length * 0.4)
				)
					continue;
				add(path);
				forks++;
				break;
			}
		}
		if (!forks) continue;
		const routes: number[][] = [];
		const visit = (path: number[]) => {
			const last = path[path.length - 1];
			if (last === base) routes.push(path);
			else for (const next of edges.get(last) ?? []) visit([...path, next]);
		};
		for (const entrance of entrances) visit([entrance]);
		const incoming = new Map<number, number>();
		for (const targets of edges.values())
			for (const target of targets)
				incoming.set(target, (incoming.get(target) ?? 0) + 1);
		const map: DefenseMap = {
			columns: grid.columns,
			rows: grid.rows,
			paths: routes.map((cells) => {
				const points = [
					{ x: slots[cells[0]].x, y: 0 },
					...cells.map((cell) => ({ ...slots[cell] })),
					{ x: slots[base].x, y: grid.height },
				];
				return points.filter((p, i) => {
					if (i === 0 || i === points.length - 1) return true;
					const cell = cells[i - 1];
					if ((edges.get(cell)?.size ?? 0) > 1 || (incoming.get(cell) ?? 0) > 1)
						return true;
					const before = points[i - 1],
						after = points[i + 1];
					return !(
						(before.x === p.x && p.x === after.x) ||
						(before.y === p.y && p.y === after.y)
					);
				});
			}),
		};
		const readable = map.paths.every((path) => {
			let turns = 0;
			for (let i = 2; i < path.length; i++) {
				if ((path[i].x === path[i - 1].x) !== (path[i - 1].x === path[i - 2].x))
					turns++;
			}
			return turns <= 10;
		});
		if (readable && validMap(map)) return map;
	}
	// Bounded fallback: still connected and branched if carving exhausts its budget.
	const mirrored = random.int(0, 1) === 1;
	return {
		columns: grid.columns,
		rows: grid.rows,
		paths: [24, grid.width - 24].flatMap((entrance) =>
			[24, grid.width - 24].map((branch) =>
				[
					{ x: entrance, y: 0 },
					{ x: entrance, y: 120 },
					{ x: 168, y: 120 },
					{ x: 168, y: 216 },
					{ x: branch, y: 216 },
					{ x: branch, y: 360 },
					{ x: 168, y: 360 },
					{ x: 168, y: grid.height },
				].map((p) => ({ x: mirrored ? grid.width - p.x : p.x, y: p.y })),
			),
		),
	};
}
