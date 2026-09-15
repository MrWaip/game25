export type DamageType = "physical" | "magic";
export type TowerDefinition = {
	title: string;
	description: string;
	glyph: string;
	cost: number;
	damage: number;
	interval: number;
	range: number;
	type: DamageType;
	attack: {
		shape: "direct" | "splash";
		radius: number;
		chains: boolean;
		slow: number;
	};
};
export const towerDefinitions = {
	rapid: {
		damage: 6,
		interval: 0.4,
		range: 96,
		cost: 30,
		title: "Стрелок",
		description: "Частые физические атаки. Снимает заряды щита.",
		type: "physical",
		glyph: "⌁",
		attack: { shape: "direct", radius: 0, chains: true, slow: 0 },
	},
	blast: {
		damage: 18,
		interval: 1.6,
		range: 156,
		cost: 30,
		title: "Мортира",
		description: "Дальнобойный физический взрыв по группе.",
		type: "physical",
		glyph: "✹",
		attack: { shape: "splash", radius: 65, chains: false, slow: 0 },
	},
	frost: {
		damage: 3,
		interval: 0.9,
		range: 72,
		cost: 30,
		title: "Мороз",
		description: "Ближняя магическая атака, замедляет на 2 секунды.",
		type: "magic",
		glyph: "❄",
		attack: { shape: "direct", radius: 0, chains: false, slow: 2 },
	},
	arcane: {
		damage: 18,
		interval: 1.1,
		range: 120,
		cost: 30,
		title: "Аркана",
		description: "Дальний магический удар. Пробивает физическую броню.",
		type: "magic",
		glyph: "◇",
		attack: { shape: "direct", radius: 0, chains: false, slow: 0 },
	},
} as const satisfies Record<string, TowerDefinition>;
export type TowerKind = keyof typeof towerDefinitions;
export const towerKinds = Object.keys(towerDefinitions) as TowerKind[];
