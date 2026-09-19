import { pointOnRoad } from "../board";
import type { Run } from "../components/runComponent";
import { squadSize } from "../definitions/enemies";
import { activeRelics, shieldFactor } from "./relicEffects";
import { withinRadius } from "@/primitives/spatial";
import { behead } from "../definitions/effects";
import type { EnemyState } from "../model";

export function damageEnemy(
	target: EnemyState,
	amount: number,
	run: Run,
): void {
	if (target.hp <= 0) return;
	// A coating that soaks the target multiplies every hit it takes.
	target.hp -=
		amount *
		(target.oil > 0 ? target.vulnerability : 1) *
		shieldFactor(run.relics, target.kind);
	if (target.kind !== "shieldSquad" || target.hp > 0) return;
	const index = run.enemies.indexOf(target);
	if (index < 0) return;
	const position = pointOnRoad(target.distance, run.level);
	run.shots.push({
		from: position,
		to: position,
		sprite: "shieldBreak",
		fire: false,
		age: 0,
	});
	// The breaking hit is fully absorbed. New goblins are not hit again by its AoE.
	const members: EnemyState[] = Array.from({ length: squadSize }, (_, i) => ({
		id: i === 0 ? target.id : run.nextId++,
		kind: "goblin",
		distance: Math.max(0, target.distance - i * 9),
		hp: target.memberHp!,
		maxHp: target.memberHp!,
		oil: 0,
		layers: 0,
		slow: 0,
		acid: 0,
		vulnerability: 1,
		stun: 0,
		burn: 0,
		burnStacks: 0,
		spreadIn: 0,
	}));
	run.enemies.splice(index, 1, ...members);
	if (!activeRelics(run.relics).includes("behead")) return;
	for (const enemy of withinRadius(run.enemies, position, behead.radius, (e) =>
		pointOnRoad(e.distance, run.level),
	))
		if (!members.includes(enemy)) enemy.hp -= behead.damage;
	for (const member of members) member.hp -= behead.damage;
}
