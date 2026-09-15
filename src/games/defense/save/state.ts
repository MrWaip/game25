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
};
type SavedTower = {
	slot: number;
	kind: TowerKind;
	level: number;
	cooldown: number;
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
		bonuses: {
			shieldBurst: state.bonuses.shieldBurst,
			frostRelay: state.bonuses.frostRelay,
			conduction: state.bonuses.conduction,
			coldDeath: state.bonuses.coldDeath,
			snowfall: state.bonuses.snowfall,
			portal: state.bonuses.portal,
			chill: state.bonuses.chill,
			shatter: state.bonuses.shatter,
			echo: state.bonuses.echo,
			freeze: state.bonuses.freeze,
			chain: state.bonuses.chain,
			power: state.bonuses.power,
			haste: state.bonuses.haste,
		},
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
	};
}

export function savedTower(tower: SavedTower): SavedTower {
	return {
		slot: tower.slot,
		kind: tower.kind,
		level: tower.level,
		cooldown: tower.cooldown,
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
	};
}
