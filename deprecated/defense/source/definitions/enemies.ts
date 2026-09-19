import type { DamageType } from "@/games/defense/definitions/towers";
export type EnemyDefinition = {
	title: string;
	description: string;
	hp: number;
	speed: number;
	shield: number;
	glyph: string;
	radius: number;
	breachDamage: number;
	resistance: Record<DamageType, number>;
	speedAura?: { radius: number; multiplier: number };
	shieldRefresh?: { interval: number; charges: number };
};
export const enemyDefinitions: Record<
	"normal" | "fast" | "shield" | "tank" | "wisp" | "herald" | "boss",
	EnemyDefinition
> = {
	normal: {
		title: "Бродяга",
		description: "Без защиты.",
		hp: 32,
		speed: 85,
		shield: 0,
		glyph: "•",
		radius: 9,
		breachDamage: 1,
		resistance: { physical: 0, magic: 0 },
	},
	fast: {
		title: "Бегун",
		description: "Быстро проходит оборону. Удерживай снегом или морозом.",
		hp: 26,
		speed: 130,
		shield: 0,
		glyph: "»",
		radius: 9,
		breachDamage: 1,
		resistance: { physical: 0, magic: 0 },
	},
	shield: {
		title: "Щитовик",
		description: "Три заряда щита. Каждый поглощает одно попадание.",
		hp: 35,
		speed: 75,
		shield: 3,
		glyph: "⬡",
		radius: 9,
		breachDamage: 1,
		resistance: { physical: 0, magic: 0 },
	},
	tank: {
		title: "Латник",
		description: "Снижает физический урон на 65%. Уязвим к магии.",
		hp: 60,
		speed: 65,
		shield: 0,
		glyph: "▣",
		radius: 12,
		breachDamage: 1,
		resistance: { physical: 0.65, magic: 0 },
	},
	wisp: {
		title: "Дух",
		description: "Снижает магический урон на 70%. Используй физические башни.",
		hp: 38,
		speed: 92,
		shield: 0,
		glyph: "◇",
		radius: 9,
		breachDamage: 1,
		resistance: { physical: 0, magic: 0.7 },
	},
	herald: {
		title: "Знаменосец",
		description: "Ускоряет соседей на 30% в радиусе 80. Опасен рядом с роем.",
		hp: 50,
		speed: 100,
		shield: 0,
		glyph: "⚑",
		radius: 9,
		breachDamage: 1,
		resistance: { physical: 0, magic: 0 },
		speedAura: { radius: 80, multiplier: 1.3 },
	},
	boss: {
		title: "Хранитель разлома",
		description:
			"Восстанавливает четыре заряда щита каждые 6 с. Прорыв отнимает 5 здоровья.",
		hp: 350,
		speed: 52,
		shield: 4,
		glyph: "♜",
		radius: 17,
		breachDamage: 5,
		resistance: { physical: 0, magic: 0 },
		shieldRefresh: { interval: 6, charges: 4 },
	},
};
export type EnemyKind = keyof typeof enemyDefinitions;
