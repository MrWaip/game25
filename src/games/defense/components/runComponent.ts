import { Component } from "@/components/component";
import type {
	Phase,
	RelicId,
	TowerState,
	EnemyState,
	ShotState,
} from "../model";
import { balance } from "../config";
export class Run extends Component {
	runId: string = crypto.randomUUID();
	completedWaves = 0;
	elapsedSeconds = 0;
	phase: Phase = "ready";
	coins = balance.startCoins;
	health = balance.health;
	wave = 0;
	level = 1;
	fallTime = 0;
	kills = 0;
	towersBuilt = 0;
	flyerKills = 0;
	stunKills = 0;
	ignites = 0;
	piggyCoins = 0;
	nextOrder = 1;
	coinsEarned = 0;
	coinsSpent = 0;
	enemies: EnemyState[] = [];
	shots: ShotState[] = [];
	remaining = 0;
	spawnIn = 0;
	nextId = 1;
	towers: TowerState[] = [];
	relics: RelicId[] = [];
	offers: RelicId[] = [];
	constructor(public seed: string) {
		super();
	}
}
