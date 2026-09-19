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
	charge: {
		modifiers: { chargeDamage: 24 },
		title: "Катушка",
		icon: "ϟ",
		category: "ПОПАДАНИЯ → РАЗРЯД",
		max: 20,
		description:
			"Каждое пятое прямое попадание по врагу разряжает 24 магического урона в него и двух соседей. Повтор: +24.",
	},
	acidBurst: {
		modifiers: { acidBurstDamage: 20 },
		title: "Едкая реакция",
		icon: "◈",
		category: "БРОНЯ → ВЗРЫВ",
		max: 20,
		description:
			"Убитый разъеденный враг выпускает кислотный взрыв: 20 магического урона и 20% разъедания соседям. Повтор: +20.",
	},
	execution: {
		modifiers: { executionThreshold: 0.15 },
		title: "Приговор",
		icon: "†",
		category: "ДОБИВАНИЕ",
		max: 1,
		description:
			"Прямое попадание добивает обычного врага ниже 15% здоровья. На боссе порог 5%.",
	},
	soulHarvest: {
		modifiers: { harvestGrowth: 1 },
		title: "Сбор душ",
		icon: "◉",
		category: "УБИЙСТВА → РОСТ",
		max: 1,
		description:
			"Каждые 10 убийств с этим джокером навсегда добавляют ему 5% урона всем башням. При продаже рост теряется.",
	},
	solitude: {
		modifiers: { solitudeBonus: 0.8 },
		title: "Одинокий страж",
		icon: "♜",
		category: "РАССТАНОВКА",
		max: 10,
		description:
			"Башня без соседей в радиусе 100 наносит на 80% больше урона. Повтор: +80%.",
	},
	auraPower: {
		modifiers: { auraDamageBonus: 0.5 },
		title: "Резонанс",
		icon: "✺",
		category: "АУРА → УРОН",
		max: 10,
		description:
			"Башни под аурой Усилителя наносят на 50% больше урона. Повтор: +50%.",
	},
	overdriveEcho: {
		modifiers: { overdriveSplash: 0.6 },
		title: "Перегрев",
		icon: "☄",
		category: "ФОРСАЖ → ВЗРЫВ",
		max: 10,
		description:
			"Во время Форсажа каждое прямое попадание даёт магический взрыв на 60% урона атаки. Повтор: +60%.",
	},
	crossfire: {
		modifiers: { crossfireBonus: 0.6 },
		title: "Перекрёстный огонь",
		icon: "⤨",
		category: "ФИЗИКА + МАГИЯ",
		max: 10,
		description:
			"Чередование физических и магических попаданий по одной цели усиливает следующее на 60%. Повтор: +60%.",
	},
	reserve: {
		modifiers: { reserveIncome: 12 },
		title: "Резерв",
		icon: "◈",
		category: "ЭКОНОМИКА",
		max: 5,
		description: "Волна без Форсажа приносит ещё 12 монет. Повтор: +12.",
	},

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
