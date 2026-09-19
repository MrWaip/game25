import type { Point } from "@/primitives/spatial";
import type { EnemyKind, SpriteId } from "../model";
export type EnemyDefinition = {
	id: EnemyKind;
	title: string;
	speed: number;
	spacing: number;
	breachDamage: number;
	/** Oil, and everything built on it, needs a reachable unarmoured body. */
	oilable: boolean;
	/** Height above the road; airborne enemies ignore ground splash. */
	hover: number;
	sprite: SpriteId;
	spriteSize: number;
	spriteAnchor: Point;
};
export const enemies: Record<EnemyKind, EnemyDefinition> = {
	shieldSquad: {
		id: "shieldSquad",
		title: "Отряд под щитами",
		speed: 48,
		spacing: 56,
		breachDamage: 5,
		oilable: false,
		hover: 0,
		sprite: "shieldSquad",
		spriteSize: 66,
		spriteAnchor: { x: 0.5, y: 0.85 },
	},
	goblin: {
		id: "goblin",
		title: "Гоблин",
		speed: 48,
		spacing: 28,
		breachDamage: 1,
		oilable: true,
		hover: 0,
		sprite: "goblin",
		spriteSize: 36,
		spriteAnchor: { x: 0.5, y: 0.85 },
	},
	flyer: {
		id: "flyer",
		title: "Летун",
		speed: 64,
		spacing: 44,
		breachDamage: 2,
		oilable: false,
		hover: 20,
		sprite: "flyer",
		spriteSize: 58,
		spriteAnchor: { x: 0.5, y: 0.7 },
	},
};

export const squadSize = 5;
export const shieldHealth = 144;
export const flyerToughness = 1.4;
