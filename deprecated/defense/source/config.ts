export type { TowerKind } from "@/games/defense/definitions/towers";
export { towerKinds } from "@/games/defense/definitions/towers";
export type Phase = "draft" | "prepare" | "wave" | "reward" | "lost";
export { upgrades, starters } from "@/games/defense/definitions/upgrades";
export type { Upgrade, Starter } from "@/games/defense/definitions/upgrades";
export const milestone = { interval: 5, coins: 100, healing: 2 };
export const isMilestone = (wave: number) =>
	wave > 0 && wave % milestone.interval === 0;
export const economy = {
	upgradeCost: 35,
	maxLevel: 99,
	saleFraction: 0.5,
	killReward: 2,
	waveReward: 35,
} as const;
