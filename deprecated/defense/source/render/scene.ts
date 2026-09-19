import type { WorldPoint } from "@/render/projection";

export type BadgeVisual = Readonly<{
	icon: string;
	label: string;
	color: string;
}>;
export type CircleVisual = Readonly<{ position: WorldPoint; radius: number }>;
export type SegmentVisual = Readonly<{ from: WorldPoint; to: WorldPoint }>;
export type PortalVisual = Readonly<{
	position: WorldPoint;
	role: "entrance" | "exit";
	ready: boolean;
	progress: number;
}>;
export type PlacementVisual = Readonly<{
	position: WorldPoint;
	allowed: boolean;
	hover: boolean;
}>;
export type TowerVisual = Readonly<{
	position: WorldPoint;
	color: string;
	glyph: string;
	level: number;
	form: "rapid" | "blast" | "frost" | "arcane" | "corrode" | "amplifier";
	boosted: boolean;
	overdrive: number;
	badges: readonly BadgeVisual[];
}>;
export type EnemyVisual = Readonly<{
	position: WorldPoint;
	color: string;
	glyph: string;
	radius: number;
	teleported: boolean;
	shield: number;
	chilled: boolean;
	corrosion: number;
	charge: number;
	armor: boolean;
	health: number;
	badges: readonly BadgeVisual[];
	shieldLabel: string | null;
}>;
export type ShotVisual = SegmentVisual &
	Readonly<{
		color: string;
		alpha: number;
		blastRadius: number | null;
		shatter: boolean;
		style:
			| "shot"
			| "blast"
			| "shatter"
			| "lightning"
			| "acid"
			| "execute"
			| "crossfire";
	}>;
export type LabelVisual = Readonly<{
	position: WorldPoint;
	text: string;
	align: "left" | "center" | "right";
}>;

/** Prepared drawing data. No rules, ECS objects, commands or simulation snapshot. */
export type BoardScene = Readonly<{
	grid: Readonly<{
		columns: number;
		rows: number;
		cell: number;
		width: number;
		height: number;
	}>;
	time: number;
	cells: readonly Readonly<{
		position: WorldPoint;
		tone: "quiet" | "normal" | "accent" | "locked";
	}>[];
	roads: readonly SegmentVisual[];
	links: readonly SegmentVisual[];
	snow: CircleVisual | null;
	range: CircleVisual | null;
	auras: readonly CircleVisual[];
	portalLink: SegmentVisual | null;
	portals: readonly PortalVisual[];
	towers: readonly TowerVisual[];
	enemies: readonly EnemyVisual[];
	shots: readonly ShotVisual[];
	labels: readonly LabelVisual[];
	placement: readonly PlacementVisual[];
	selected: WorldPoint | null;
}>;
