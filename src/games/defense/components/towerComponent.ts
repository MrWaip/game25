import { Component } from "@/components/component";
import type { TowerKind } from "@/games/defense/config";
export class Tower extends Component {
	cooldown = 0;
	shots?: {
		x: number;
		y: number;
		life: number;
		effect?: "shot" | "blast" | "shatter";
	}[];
	level = 1;
	constructor(
		public slot: number,
		public kind: TowerKind,
	) {
		super();
	}
}
