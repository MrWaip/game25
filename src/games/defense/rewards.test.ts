import { expect, it } from "vite-plus/test";
import { rewardChoices, starterChoices } from "@/games/defense/rewards";
import { Run } from "@/games/defense/components/runComponent";
import { starters, upgrades, type Upgrade } from "@/games/defense/config";

it("offers different opening builds by seed and repeats the same draft by code", () => {
	const combinations = new Set<string>();
	const offered = new Set<string>();
	for (let i = 0; i < 100; i++) {
		const seed = `opening-${i}`;
		const choices = starterChoices(seed);
		expect(choices).toEqual(starterChoices(seed));
		expect(new Set(choices).size).toBe(3);
		for (const choice of choices) {
			expect(starters[choice]).toBeDefined();
			offered.add(choice);
		}
		combinations.add([...choices].sort().join(","));
	}
	expect(combinations.size).toBeGreaterThan(10);
	expect(offered.size).toBe(Object.keys(starters).length);
});

it("keeps three distinct rewards after all finite upgrades are collected", () => {
	const run = new Run("late-draft");
	for (const key of Object.keys(upgrades) as Upgrade[])
		run.bonuses[key] = Math.min(20, upgrades[key].max);
	const offered = new Set<Upgrade>();
	for (let wave = 18; wave <= 100; wave++) {
		run.wave = wave;
		const choices = rewardChoices(run);
		expect(choices).toEqual(rewardChoices(run));
		expect(new Set(choices).size).toBe(3);
		for (const key of choices) offered.add(key);
	}
	expect(offered.has("shieldBurst")).toBe(true);
	expect(offered.has("conduction")).toBe(true);
	expect(offered.size).toBeGreaterThanOrEqual(6);
});
