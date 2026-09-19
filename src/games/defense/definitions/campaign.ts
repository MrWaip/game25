import type { BiomeId } from "../theme";
import type { EnemyKind } from "../model";
import { flyerToughness, shieldHealth } from "./enemies";
export type AssaultDefinition = {
	title: string;
	count: number;
	interval: number;
	health: number;
	shieldHealth: number;
	squads: number[];
	flyers: number[];
	pauseBefore: number;
};
export type WaveDefinition = {
	assaults: AssaultDefinition[];
	count: number;
	bounty: number;
};
export type LevelDefinition = {
	chapter: number;
	biome: BiomeId;
	title: string;
	challenge: string | null;
	waves: [WaveDefinition, WaveDefinition, WaveDefinition];
};
function flock(size: number, count: number): number[] {
	const slots = [1, 5, 9, 13, 4, 8, 12, 0].filter((slot) => slot < count);
	return slots.slice(0, size);
}
function wave(waveNumber: number, health: number): WaveDefinition {
	const chapter = Math.floor((waveNumber - 1) / 3);
	const introduction = waveNumber === 1;
	const counts = introduction
		? [4, 6, 8]
		: [6 + chapter, 10 + chapter, 12 + chapter, 16 + chapter];
	const titles = introduction
		? ["Разведка", "Подкрепление", "Финальный натиск"]
		: ["Разведка", "Нарастание", "Давление", "Финальный натиск"];
	const intervals = introduction ? [2.1, 1.5, 1] : [2, 1.5, 1, 0.8];
	const multipliers = introduction ? [1, 1.1, 1.2] : [0.85, 1, 1.15, 1.4];
	const last = counts.length - 1;
	const assaults = counts.map((count, index): AssaultDefinition => ({
		title: titles[index],
		count,
		interval: intervals[index],
		health: Math.round(health * multipliers[index]),
		shieldHealth: Math.max(
			shieldHealth,
			Math.round(health * multipliers[index] * 3.2),
		),
		pauseBefore: index === 0 ? 0 : index === 1 ? 4 : 3,
		squads:
			waveNumber < 3 || index < 2
				? []
				: index === 2
					? [3]
					: Array.from(
							{ length: Math.min(4, 2 + Math.floor(chapter / 2)) },
							(_, i) => 2 + i * 4,
						),
		// Flyer slots never collide with squad slots, which sit on 2 + 4k and 3.
		flyers:
			waveNumber < 4 || index === 0
				? []
				: index === last
					? flock(Math.min(8, chapter + 1), count)
					: waveNumber >= 6 && index === last - 1
						? flock(Math.min(4, chapter), count)
						: [],
	}));
	return {
		assaults,
		count: counts.reduce((sum, count) => sum + count, 0),
		bounty: waveNumber === 1 ? 8 : chapter === 0 ? 6 : 5,
	};
}

export function waveSpawn(
	wave: WaveDefinition,
	index: number,
):
	| {
			kind: EnemyKind;
			health: number;
			shieldHealth: number;
			assault: number;
			delay: number;
	  }
	| undefined {
	if (index < 0) return undefined;
	let offset = 0;
	for (const [assaultIndex, assault] of wave.assaults.entries()) {
		const local = index - offset;
		if (local < assault.count)
			return {
				kind: assault.squads.includes(local)
					? "shieldSquad"
					: assault.flyers.includes(local)
						? "flyer"
						: "goblin",
				health: assault.flyers.includes(local)
					? Math.round(assault.health * flyerToughness)
					: assault.health,
				shieldHealth: assault.shieldHealth,
				assault: assaultIndex,
				delay: local === 0 ? assault.pauseBefore : assault.interval,
			};
		offset += assault.count;
	}
	return undefined;
}

export function assaultProgress(waveNumber: number, remaining: number) {
	const wave = waveDefinition(waveNumber);
	const spawn = waveSpawn(wave, Math.max(0, wave.count - remaining - 1))!;
	return {
		index: spawn.assault + 1,
		total: wave.assaults.length,
		title: wave.assaults[spawn.assault].title,
	};
}
export const campaign: LevelDefinition[] = [
	{
		chapter: 1,
		biome: "forest",
		title: "Лесные ворота",
		challenge: null,
		waves: [wave(1, 30), wave(2, 42), wave(3, 60)],
	},
	{
		chapter: 2,
		biome: "autumn",
		title: "Осенняя роща",
		challenge: null,
		waves: [wave(4, 75), wave(5, 90), wave(6, 110)],
	},
	{
		chapter: 3,
		biome: "deadwood",
		title: "Мёртвый лес",
		challenge: "Плотный отряд",
		waves: [wave(7, 125), wave(8, 145), wave(9, 165)],
	},
	{
		chapter: 4,
		biome: "drylands",
		title: "Засушливые земли",
		challenge: null,
		waves: [wave(10, 190), wave(11, 215), wave(12, 240)],
	},
	{
		chapter: 5,
		biome: "desert",
		title: "Пустыня",
		challenge: null,
		waves: [wave(13, 270), wave(14, 300), wave(15, 330)],
	},
	{
		chapter: 6,
		biome: "volcano",
		title: "Лавовые земли",
		challenge: "Большой набег",
		waves: [wave(16, 365), wave(17, 400), wave(18, 440)],
	},
];
export const totalWaves = campaign.reduce(
	(total, level) => total + level.waves.length,
	0,
);
/** Waves past the last chapter keep the same curve, compounding every wave. */
const endlessGrowth = 1.1;
const endlessWaves = new Map<number, WaveDefinition>();
export function waveDefinition(waveNumber: number): WaveDefinition {
	if (waveNumber <= totalWaves)
		return campaign[Math.floor((waveNumber - 1) / 3)].waves[
			(waveNumber - 1) % 3
		];
	let generated = endlessWaves.get(waveNumber);
	if (!generated) {
		// The authored health of the last wave, read back through its first assault.
		const lastHealth = campaign.at(-1)!.waves[2].assaults[0].health / 0.85;
		generated = wave(
			waveNumber,
			Math.round(lastHealth * endlessGrowth ** (waveNumber - totalWaves)),
		);
		endlessWaves.set(waveNumber, generated);
	}
	return generated;
}

/** Chapters past the campaign repeat its biomes in the authored order. */
export function levelDefinition(level: number): LevelDefinition {
	const authored = campaign[(level - 1) % campaign.length];
	return level <= campaign.length
		? authored
		: { ...authored, chapter: level, waves: authored.waves };
}
