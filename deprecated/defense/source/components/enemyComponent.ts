import type { EnemyKind } from "@/games/defense/definitions/enemies";
import { Component } from "@/components/component";
export class Enemy extends Component {
	maxHp: number;
	segment = 1;
	x = 0;
	y = 0;
	path = 0;
	progress = 0;
	slow = 0;
	teleported = false;
	shield = 0;
	shieldTimer = 0;
	corrosion = 0;
	corrosionTime = 0;
	charge = 0;
	lastDamage: "physical" | "magic" | null = null;
	constructor(
		public hp: number,
		public speed: number,
		public kind: EnemyKind,
	) {
		super();
		this.maxHp = hp;
	}
}
