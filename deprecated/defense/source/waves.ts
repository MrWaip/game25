import type { EnemyKind } from "@/games/defense/definitions/enemies";
type Wave = {
	title: string;
	description: string;
	enemies: readonly EnemyKind[];
};
export const waves: readonly Wave[] = [
	{
		title: "Первый контакт",
		description:
			"8 бродяг. Расположи башни так, чтобы они обстреливали несколько участков пути.",
		enemies: Array<EnemyKind>(8).fill("normal"),
	},
	{
		title: "За щитами",
		description:
			"Щитовики прикрывают быстрых бегунов. Частые выстрелы снимают защиту.",
		enemies: [
			"shield",
			"fast",
			"fast",
			"shield",
			"normal",
			"shield",
			"fast",
			"fast",
			"shield",
			"normal",
		],
	},
	{
		title: "Две защиты",
		description:
			"Латники держат физический урон, духи — магический. Нужны оба типа атаки.",
		enemies: [
			"tank",
			"wisp",
			"normal",
			"tank",
			"wisp",
			"normal",
			"tank",
			"wisp",
			"normal",
			"wisp",
			"tank",
			"normal",
		],
	},
	{
		title: "Марш роя",
		description:
			"Знаменосцы ускоряют соседей. Замедление и площадной урон удержат группу.",
		enemies: [
			"shield",
			"herald",
			"fast",
			"fast",
			"fast",
			"tank",
			"fast",
			"shield",
			"herald",
			"fast",
			"fast",
			"fast",
			"tank",
			"fast",
		],
	},
	{
		title: "Хранитель",
		description:
			"Босс восстанавливает щит каждые 6 с. Стрелки открывают окно для мощных атак.",
		enemies: [
			"shield",
			"boss",
			"herald",
			"fast",
			"wisp",
			"tank",
			"fast",
			"shield",
			"fast",
			"wisp",
			"tank",
			"fast",
			"normal",
			"fast",
			"normal",
			"fast",
		],
	},
];
export function waveAt(number: number): Wave {
	const index = Math.max(0, number - 1);
	const template = waves[index % waves.length];
	const cycle = Math.floor(index / waves.length);
	if (cycle === 0) return template;
	const count = Math.min(32, template.enemies.length + cycle * 2);
	const squads: readonly (readonly EnemyKind[])[] = [
		["shield", "herald", "normal", "fast"],
		["shield", "herald", "fast", "fast"],
		["tank", "herald", "wisp", "shield"],
		["shield", "herald", "fast", "tank"],
		["boss", "herald", "shield", "wisp"],
	];
	const squad = squads[index % waves.length];
	return {
		title: `${template.title} · этап ${cycle + 1}${(index + 1) % 5 === 0 ? ` · ${bossRuleAt(index + 1).title}` : ""}`,
		description: `${count} врагов с увеличенным здоровьем. ${template.description.replace("8 бродяг. ", "")} ${(index + 1) % 5 === 0 ? bossRuleAt(index + 1).description : ""}`,
		enemies: Array.from({ length: count }, (_, i) =>
			i >= 4 && squad[i % 4] === "boss" ? "tank" : squad[i % 4],
		),
	};
}

/** The opening stays approachable; later waves outgrow a static defense.
 * Population and speed stay bounded for mobile play; health keeps growing.
 */
export function waveDifficulty(wave: number) {
	const index = Math.max(0, wave - 1);
	const late = Math.max(0, wave - 5);
	return {
		health:
			(1 + (index % 5) * 0.18) *
			Math.pow(2.05, Math.min(350, Math.floor(index / 5))),
		speed: 1 + Math.min(0.3, late * 0.015),
		spawnInterval: Math.max(0.3, 0.75 / (1 + late * 0.045)),
	};
}

/** Forecast before the wave; fixed stage rules never react to the player's build. */
export function bossRuleAt(wave: number) {
	const rules = [
		{
			title: "Щитовой конвой",
			description:
				"Босс обновляет щиты; частые атаки открывают окно для тяжёлых орудий.",
			spacing: 0.12,
			escort: "shield",
		},
		{
			title: "Рассыпной строй",
			description:
				"Свита идёт с интервалом. Площадные взрывы реже задевают группу.",
			spacing: 0.7,
			escort: "fast",
		},
		{
			title: "Латная свита",
			description:
				"Латники прикрывают знаменосцев. Магия или разъедание открывают конвой.",
			spacing: 0.12,
			escort: "tank",
		},
	] as const;
	return rules[Math.floor(Math.max(0, wave - 1) / 5) % rules.length];
}
