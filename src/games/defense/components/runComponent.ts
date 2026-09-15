import type { DefenseMap } from "@/games/defense/board";
import { generateMap } from "@/games/defense/mapGeneration";
import { Component } from "@/components/component";
import { upgrades, type Phase, type Upgrade } from "@/games/defense/config";
export type PortalState = { entrance: number; exit: number; cooldown: number };
export class Run extends Component {
	runId = crypto.randomUUID();
	elapsedSeconds: number | null = 0;
	phase: Phase = "draft";
	coins = 90;
	wave = 0;
	health = 10;
	kills = 0;
	remaining = 0;
	spawnIn = 0;
	choices: Upgrade[] = [];
	bonuses = Object.fromEntries(
		Object.keys(upgrades).map((key) => [key, 0]),
	) as Record<Upgrade, number>;
	pendingWorld: "snow" | "portal" | null = null;
	snow: number | null = null;
	portal: PortalState | null = null;
	elapsed = 0;
	waveKills = 0;
	waveLeaks = 0;
	teleports = 0;
	shatters = 0;
	constructor(
		public seed: string,
		public map: DefenseMap = generateMap(seed),
	) {
		super();
	}
}
