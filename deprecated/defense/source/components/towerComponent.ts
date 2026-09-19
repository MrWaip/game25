import { Component } from "@/components/component";
import type { TowerKind } from "@/games/defense/config";
export class Tower extends Component {
	priority: "first" | "shield" | "strong" | "support" = "first";
	specialization: "focus" | "spread" | null = null;
	overdrive = 0;
	cooldown = 0;
	shots?: {
		x: number;
		y: number;
		life: number;
		effect?:
			| "shot"
			| "blast"
			| "shatter"
			| "lightning"
			| "acid"
			| "execute"
			| "crossfire";
	}[];
	level = 1;
	constructor(
		public slot: number,
		public kind: TowerKind,
	) {
		super();
	}
}
