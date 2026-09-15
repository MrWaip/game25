import type { BuildModifiers } from "@/games/defense/effects/buildModifiers";
export type WorldEffectKind = "snow" | "portal";
export type UpgradeDefinition = {
	title: string;
	description: string;
	category: string;
	icon: string;
	max: number;
	modifiers: Partial<BuildModifiers>;
	world?: WorldEffectKind;
	requires?: readonly string[];
};
export const upgrades = {
	shieldBurst: {
		modifiers: { shieldBurstDamage: 18 },
		title: "Перегрузка щита",
		description:
			"Снятие последнего заряда щита взрывает его: 18 магического урона в радиусе 65. Рикошеты вскрывают сразу несколько щитов. Повтор: +18 урона.",
		category: "ЩИТЫ → ВЗРЫВ",
		icon: "✧",
		max: Number.MAX_SAFE_INTEGER,
	},
	frostRelay: {
		modifiers: { frostSplash: 48 },
		title: "Ледяная сеть",
		description:
			"Мороз бьёт и замедляет всю группу в радиусе 48 от цели. Готовит врагов для хрупкости и ледяных осколков.",
		category: "МОРОЗ → ГРУППА",
		icon: "❄",
		max: 1,
	},
	conduction: {
		modifiers: { conductionDamage: 10 },
		requires: ["chain"],
		title: "Проводник",
		description:
			"Если основная цель стрелка замедлена, все его попадания наносят ещё 10 магического урона. Повтор: +10 урона.",
		category: "МОРОЗ + РИКОШЕТ",
		icon: "⌁",
		max: Number.MAX_SAFE_INTEGER,
	},
	coldDeath: {
		modifiers: { deathSlow: 2 },
		title: "Цепная стужа",
		description:
			"Убитый замедленный враг замедляет соседей в радиусе 80 на 2 с. Стужа передаётся от одной жертвы к следующей.",
		category: "УБИЙСТВО → МОРОЗ",
		icon: "❄",
		max: 1,
	},
	snowfall: {
		modifiers: {},
		world: "snow",
		title: "Снегопад",
		description:
			"Размести снежную область. Враги в ней медленнее на 40%, башни — на 20%.",
		category: "МИР",
		icon: "❄",
		max: 1,
	},
	portal: {
		modifiers: {},
		world: "portal",
		title: "Разлом",
		description:
			"Свяжи две клетки пути: вход возвращает врага к выходу. Один перенос на врага, перезарядка 3 с.",
		category: "МИР",
		icon: "◎",
		max: 1,
	},
	chill: {
		modifiers: { chilledDamageBonus: 0.5 },
		title: "Хрупкость",
		description:
			"Замедленные враги получают на 50% больше урона. Сочетается со снегом и морозной башней. Повтор: ещё +50%.",
		category: "ДЖОКЕР",
		icon: "◇",
		max: Number.MAX_SAFE_INTEGER,
	},
	shatter: {
		modifiers: { shardDamage: 12 },
		title: "Ледяные осколки",
		description:
			"Попадание мортиры по замедленной цели добавляет магический взрыв на 12 урона вокруг неё. Повтор: +12 урона.",
		category: "ДЖОКЕР",
		icon: "✧",
		max: Number.MAX_SAFE_INTEGER,
	},
	echo: {
		modifiers: { teleportDamageBonus: 0.5, teleportSlow: 3 },
		requires: ["portal"],
		title: "Эхо разлома",
		description:
			"Перенесённый враг замедляется на 3 с и получает на 50% больше урона до конца волны.",
		category: "ДЖОКЕР",
		icon: "↺",
		max: 1,
	},
	freeze: {
		modifiers: { slowDurationBonus: 1, snowRadiusBonus: 24, snowAdaptation: 1 },
		requires: ["snowfall"],
		title: "Вечная мерзлота",
		description:
			"Снег шире, мороз держится дольше. Башни больше не теряют скорость в снегу.",
		category: "ДЖОКЕР",
		icon: "✳",
		max: 1,
	},
	chain: {
		modifiers: { additionalTargets: 1 },
		title: "Рикошет",
		description:
			"Каждый выстрел стрелка попадает ещё в одну цель. Быстрее вскрывает щиты у группы.",
		category: "ДЖОКЕР",
		icon: "⌁",
		max: 2,
	},
	power: {
		modifiers: { damageBonus: 0.25 },
		title: "Тяжёлый калибр",
		description:
			"Добавляет 25% базового урона всем башням. Можно брать повторно без ограничения.",
		category: "ДЖОКЕР",
		icon: "↑",
		max: Number.MAX_SAFE_INTEGER,
	},
	haste: {
		modifiers: { attackRateBonus: 0.2 },
		title: "Разгон",
		description:
			"Все башни стреляют на 20% чаще. Больше попаданий — быстрее снятие щитов. Повтор: ещё +20%.",
		category: "ДЖОКЕР",
		icon: "»",
		max: Number.MAX_SAFE_INTEGER,
	},
} as const satisfies Record<string, UpgradeDefinition>;
export type Upgrade = keyof typeof upgrades;
export const starters = {
	artillery: {
		title: "Тяжёлая батарея",
		description: "Все башни начинают с дополнительными 25% базового урона.",
		upgrade: "power",
		icon: "↑",
	},
	blitz: {
		title: "Быстрый залп",
		description: "Башни стреляют на 20% чаще с первой волны.",
		upgrade: "haste",
		icon: "»",
	},
	frostbite: {
		title: "Ледяная охота",
		description:
			"Замедленные враги получают на 50% больше урона. Начни с морозной башни.",
		upgrade: "chill",
		icon: "◇",
	},
	winter: {
		title: "Зимний фронт",
		description:
			"Снежная область с первого раунда. Удерживай врагов и собирай ледяные комбинации.",
		upgrade: "snowfall",
		icon: "❄",
	},
	rift: {
		title: "Архитектор разлома",
		description:
			"Поставь портал и верни врагов под огонь. Ищи эхо и замедление.",
		upgrade: "portal",
		icon: "◎",
	},
	volley: {
		title: "Перекрёстный огонь",
		description:
			"Стрелки сразу задевают вторую цель. Вскрывай щиты и сдерживай рой.",
		upgrade: "chain",
		icon: "⌁",
	},
} as const;
export type Starter = keyof typeof starters;
