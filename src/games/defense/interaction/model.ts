import type { TowerKind } from "@/games/defense/definitions/towers";
export type ConstructionAction =
	| "improve"
	| "move"
	| "replace"
	| "sell"
	| "cancel"
	| "portalBack"
	| "placeWorld"
	| "startWave";
export type ActionView = {
	id: ConstructionAction;
	label: string;
	disabled: boolean;
	tone: "normal" | "primary" | "danger";
};
export type PlacementPreview = {
	kind: TowerKind;
	from: number | null;
	hover?: number;
};
export type BoardPreview = {
	placement?: PlacementPreview | null;
	selected: number | null;
	range: { cell: number; radius: number } | null;
	snow: number | null;
	portalEntrance: number | null;
};
export type ConstructionView = {
	visible: boolean;
	battle: boolean;
	wave: { title: string; description: string; enemies: string[] };
	hint: string;
	actions: ActionView[];
	choices: {
		kind: TowerKind;
		label: string;
		title: string;
		glyph: string;
		detail: string;
		selected: boolean;
		disabled: boolean;
	}[];
	launch: ActionView | null;
	cells: boolean[];
	board: BoardPreview;
};
