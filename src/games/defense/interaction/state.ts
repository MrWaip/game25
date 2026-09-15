import type { TowerKind } from "@/games/defense/definitions/towers";

// Internal selection state. A portal exit always has an entrance; a move has a source.
export type Selection =
	| { mode: "inspect"; selected: number | null }
	| { mode: "build"; selected: number | null; kind: TowerKind }
	| { mode: "replace"; selected: number }
	| { mode: "move"; selected: null; movingFrom: number }
	| { mode: "snow" | "portalIn"; selected: number | null }
	| { mode: "portalOut"; selected: number | null; entrance: number };
export const inspect = (selected: number | null = null): Selection => ({
	mode: "inspect",
	selected,
});
