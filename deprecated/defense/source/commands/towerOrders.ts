import type { World } from "@/core/world";
import { Run } from "@/games/defense/components/runComponent";
import { Tower } from "@/games/defense/components/towerComponent";

export function orderOverdrive(world: World, cell: number): boolean {
	const run = world.getFirstComponent(Run)!;
	const tower = [...world.query(Tower)].find(
		({ components: [candidate] }) => candidate.slot === cell,
	)?.components[0];
	if (
		run.phase !== "wave" ||
		run.overdrives <= 0 ||
		!tower ||
		tower.kind === "amplifier" ||
		tower.overdrive > 0
	)
		return false;
	run.overdrives--;
	tower.overdrive = 4;
	tower.cooldown = 0;
	return true;
}

export function orderPriority(
	world: World,
	cell: number,
	priority: Tower["priority"],
): boolean {
	const run = world.getFirstComponent(Run)!;
	const tower = [...world.query(Tower)].find(
		({ components: [candidate] }) => candidate.slot === cell,
	)?.components[0];
	if (
		!["prepare", "wave"].includes(run.phase) ||
		!tower ||
		!["first", "shield", "strong", "support"].includes(priority)
	)
		return false;
	tower.priority = priority;
	return true;
}
