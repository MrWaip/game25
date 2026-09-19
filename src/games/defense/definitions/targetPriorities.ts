import type { EnemyKind, EnemyState, TowerKind } from "../model";

/** null explicitly excludes a target; lower numbers are preferred. */
export type TargetPriority = number | null;
export const targetPriorities = {
	arrow: { goblin: 1, shieldSquad: 1, flyer: 1 },
	oil: { goblin: 1, shieldSquad: null, flyer: null },
	stone: { goblin: 2, shieldSquad: 1, flyer: null },
} satisfies Record<TowerKind, Record<EnemyKind, TargetPriority>>;

export function selectTarget(
	kind: TowerKind,
	candidates: Iterable<EnemyState>,
	overrides: Partial<Record<EnemyKind, TargetPriority>> = {},
): EnemyState | undefined {
	let target: EnemyState | undefined;
	let best = Infinity;
	for (const enemy of candidates) {
		const priority =
			overrides[enemy.kind] !== undefined
				? overrides[enemy.kind]!
				: targetPriorities[kind][enemy.kind];
		if (enemy.hp <= 0 || priority === null) continue;
		if (
			priority < best ||
			(priority === best && (!target || enemy.distance > target.distance))
		) {
			target = enemy;
			best = priority;
		}
	}
	return target;
}
