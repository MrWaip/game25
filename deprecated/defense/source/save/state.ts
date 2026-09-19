import { upgrades } from "@/games/defense/definitions/upgrades";
import type { Tower } from "@/games/defense/components/towerComponent";
import type { DefenseMap } from "@/games/defense/board";
import type { Phase, Upgrade } from "@/games/defense/config";
import type { TowerKind } from "@/games/defense/definitions/towers";
import type { EnemyKind } from "@/games/defense/definitions/enemies";

// The versioned representation is explicit: display and runtime additions do not
// silently become persisted data. Keep the projections below explicit as well.
type SavedState = {
	runId: string;
	elapsedSeconds: number | null;
	seed: string;
	map: DefenseMap;
	phase: Phase;
	coins: number;
	wave: number;
	health: number;
	kills: number;
	remaining: number;
	spawnIn: number;
	choices: Upgrade[];
	bonuses: Record<Upgrade, number>;
	pendingWorld: "snow" | "portal" | null;
	snow: number | null;
	portal: { entrance: number; exit: number; cooldown: number } | null;
	elapsed: number;
	waveKills: number;
	waveLeaks: number;
	teleports: number;
	shatters: number;
	overdrives: number;
	harvestKills: number;
	towerLimit: number;
	sites: number[];
	openSites: number;
	expansionDue: boolean;
	shop: Upgrade[];
	shopRoll: number;
	heldOffer: Upgrade | null;
};
type SavedTower = {
	slot: number;
	kind: TowerKind;
	level: number;
	cooldown: number;
	priority: Tower["priority"];
	specialization: Tower["specialization"];
	overdrive: number;
};
type SavedEnemy = {
	path: number;
	hp: number;
	maxHp: number;
	speed: number;
	kind: EnemyKind;
	segment: number;
	x: number;
	y: number;
	progress: number;
	slow: number;
	teleported: boolean;
	shield: number;
	shieldTimer: number;
	corrosion: number;
	corrosionTime: number;
	charge: number;
	lastDamage: "physical" | "magic" | null;
};
export type SavedRun = SavedState & {
	towers: SavedTower[];
	enemies: SavedEnemy[];
};

export function savedState(state: SavedState): SavedState {
	return {
		runId: state.runId,
		elapsedSeconds: state.elapsedSeconds,
		seed: state.seed,
		map: {
			columns: state.map.columns,
			rows: state.map.rows,
			paths: state.map.paths.map((route) =>
				route.map((p) => ({ x: p.x, y: p.y })),
			),
		},
		phase: state.phase,
		coins: state.coins,
		wave: state.wave,
		health: state.health,
		kills: state.kills,
		remaining: state.remaining,
		spawnIn: state.spawnIn,
		choices: [...state.choices],
		bonuses: Object.fromEntries(
			(Object.keys(upgrades) as Upgrade[]).map((key) => [
				key,
				state.bonuses[key],
			]),
		) as Record<Upgrade, number>,
		pendingWorld: state.pendingWorld,
		snow: state.snow,
		portal: state.portal && {
			entrance: state.portal.entrance,
			exit: state.portal.exit,
			cooldown: state.portal.cooldown,
		},
		elapsed: state.elapsed,
		waveKills: state.waveKills,
		waveLeaks: state.waveLeaks,
		teleports: state.teleports,
		shatters: state.shatters,
		overdrives: state.overdrives,
		harvestKills: state.harvestKills,
		towerLimit: state.towerLimit,
		sites: [...state.sites],
		openSites: state.openSites,
		expansionDue: state.expansionDue,
		shop: [...state.shop],
		shopRoll: state.shopRoll,
		heldOffer: state.heldOffer,
	};
}

export function savedTower(tower: SavedTower): SavedTower {
	return {
		slot: tower.slot,
		kind: tower.kind,
		level: tower.level,
		cooldown: tower.cooldown,
		priority: tower.priority,
		specialization: tower.specialization,
		overdrive: tower.overdrive,
	};
}

export function savedEnemy(enemy: SavedEnemy): SavedEnemy {
	return {
		path: enemy.path,
		hp: enemy.hp,
		maxHp: enemy.maxHp,
		speed: enemy.speed,
		kind: enemy.kind,
		segment: enemy.segment,
		x: enemy.x,
		y: enemy.y,
		progress: enemy.progress,
		slow: enemy.slow,
		teleported: enemy.teleported,
		shield: enemy.shield,
		shieldTimer: enemy.shieldTimer,
		corrosion: enemy.corrosion,
		corrosionTime: enemy.corrosionTime,
		charge: enemy.charge,
		lastDamage: enemy.lastDamage,
	};
}
