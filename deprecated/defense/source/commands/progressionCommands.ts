import type { Run } from "@/games/defense/components/runComponent";
import { expansion } from "@/games/defense/expansion";

export type ExpansionChoice = "limit" | "income";

export function expandDefense(run: Run, choice: ExpansionChoice): boolean {
	if (run.phase !== "prepare" || !run.expansionDue) return false;
	if (choice === "limit" && run.towerLimit < expansion.maxLimit)
		run.towerLimit++;
	else if (choice === "income" && run.towerLimit >= expansion.maxLimit)
		run.coins += 75;
	else return false;
	run.expansionDue = false;
	return true;
}
