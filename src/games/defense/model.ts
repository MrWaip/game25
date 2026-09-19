export type BattleSpeed = 1 | 2 | 3;
import type { Point } from "@/primitives/spatial";
export type Phase =
	| "ready"
	| "wave"
	| "reward"
	| "prepare"
	| "falling"
	| "lost"
	| "won";
export type TowerKind = "arrow" | "oil" | "stone";
export type TowerLevel = 1 | 2 | 3;
export type ConstructionKind = "build" | "upgrade";
export type SpecializationId =
	| "fire"
	| "heads"
	| "ricochet"
	| "thick"
	| "acid"
	| "soak"
	| "heavy"
	| "stun";
export type SpecializationTowerSpriteId = `${SpecializationId}SpecializedTower`;
export type SpecializationProjectileId = `${SpecializationId}Projectile`;
export type SpecializationImpactId = `${SpecializationId}Impact`;
export type RelicRarity = "common" | "rare" | "key";
export type RelicId =
	| "tar"
	| "bellows"
	| "weight"
	| "stacks"
	| "interest"
	| "greed"
	| "whetstone"
	| "fowler"
	| "nomad"
	| "echo"
	| "piggy"
	| "brand"
	| "rush"
	| "brigade"
	| "autopsy"
	| "behead"
	| "outpost"
	| "battery"
	| "vial"
	| "chain"
	| "blueprint"
	| "bones"
	| "bridge"
	| "tinder"
	| "ash"
	| "mark"
	| "lastStand";
export type RelicSpriteId = `${RelicId}Relic`;
export type EnemyKind = "goblin" | "shieldSquad" | "flyer";
export type EffectKind = "damage" | "oil" | "ignite";
export type SpriteId =
	| "stoneTower"
	| "shieldSquad"
	| "stone"
	| "shieldBreak"
	| "arrowTower"
	| "oilTower"
	| "fireTower"
	| "foundation"
	| "goblin"
	| "goblinSide"
	| "flyer"
	| "flyerSide"
	| "gate"
	| "oak"
	| "pine"
	| "rocks"
	| "barrel"
	| "bush"
	| RelicSpriteId
	| SpecializationTowerSpriteId
	| SpecializationProjectileId
	| SpecializationImpactId
	| "arrow"
	| "oilDrop";
export type ProjectileSpriteId =
	| "arrow"
	| "oilDrop"
	| "stone"
	| SpecializationProjectileId;
export type { Point } from "@/primitives/spatial";
export type DamageEffect = { type: "damage"; amount: number };
export type OilEffect = {
	type: "oil";
	radius: number;
	duration: number;
	slow: number;
	/** Damage per second the coating deals on its own; it also eats shields. */
	acid?: number;
	/** Multiplier applied to every hit a coated enemy takes. */
	vulnerability?: number;
};
export type IgniteEffect = { type: "ignite" };
export type AttackEffect = DamageEffect | OilEffect | IgniteEffect;
export type Ricochet = { targets: number; factor: number; radius: number };
export type Stun = { duration: number; everyNth: number };
export type Attack = {
	range: number;
	interval: number;
	effects: AttackEffect[];
	projectile: ProjectileSpriteId;
	splash?: { radius: number; shieldMultiplier: number };
	ricochet?: Ricochet;
	stun?: Stun;
	/** Overrides the tower's default target priorities for this attack. */
	targets?: Partial<Record<EnemyKind, number | null>>;
};
export type Specialization = {
	id: SpecializationId;
	title: string;
	description: string;
	sprite: SpecializationTowerSpriteId;
	attack: Attack;
};
export type TowerDefinition = {
	id: TowerKind;
	title: string;
	description: string;
	sprite: SpriteId;
	price: number;
	upgradePrice: number;
	specializationPrice: number;
	attacks: [Attack, Attack];
	specializations: Specialization[];
};
export type TowerState = {
	slot: number;
	kind: TowerKind;
	level: TowerLevel;
	specialization: SpecializationId | null;
	cooldown: number;
	construction: number;
	constructionKind: ConstructionKind | null;
	/** Shots fired since the tower was built; drives every-Nth effects. */
	shots: number;
	rate: number;
	rushed: number;
	order: number;
};
export type EnemyState = {
	id: number;
	kind: EnemyKind;
	/** Health of each goblin released when a squad shield breaks. */
	memberHp?: number;
	distance: number;
	hp: number;
	maxHp: number;
	oil: number;
	layers: number;
	slow: number;
	/** Damage per second dealt by the coating itself. */
	acid: number;
	/** Multiplier applied to incoming damage while coated. */
	vulnerability: number;
	/** Seconds the enemy stays frozen in place. */
	stun: number;
	burn: number;
	burnStacks: number;
	spreadIn: number;
};
export type RelicDefinition = {
	id: RelicId;
	title: string;
	description: string;
	sprite: RelicSpriteId;
	rarity: RelicRarity;
	offered?: boolean;
};

export type ShotImpact = {
	targetId: number;
	damage: number;
	ignite: boolean;
	splash?: { radius: number; shieldMultiplier: number };
	ricochet?: Ricochet;
	stun?: number;
};
export type ShotState = {
	impact?: ShotImpact;
	hitTargetId?: number;
	from: Point;
	to: Point;
	sprite: ProjectileSpriteId | "shieldBreak" | "breach";
	fire: boolean;
	age: number;
};
