import { Tower } from "@/games/defense/components/towerComponent";
import type { TowerKind } from "@/games/defense/definitions/towers";
export function createTower(cell: number, kind: TowerKind): [Tower] {
	return [new Tower(cell, kind)];
}
