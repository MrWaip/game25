import { expect, it } from "vite-plus/test";
import { createDefenseWorld } from "@/games/defense/setup";
import { createSessionRuntime } from "@/games/defense/sessionRuntime";
import { Run } from "@/games/defense/components/runComponent";
import { createDefenseSession } from "@/games/defense/session";
import { economy, milestone } from "@/games/defense/config";
import { classicMap } from "@/games/defense/board";
import { waveAt } from "@/games/defense/waves";

it.each([5, 10, 50, 500])(
	"awards milestone %i once, restores and continues",
	async (wave) => {
		const assembly = await createDefenseWorld("endless");
		const run = assembly.world.getFirstComponent(Run)!;
		Object.assign(run, { phase: "wave", wave, remaining: 0, health: 7 });
		const game = createSessionRuntime(assembly);
		let restored: Awaited<ReturnType<typeof createDefenseSession>> | undefined;
		try {
			const coins = game.snapshot().coins;
			game.step(1);
			expect(game.snapshot()).toMatchObject({
				phase: "reward",
				health: 9,
				coins: coins + economy.waveReward + milestone.coins,
			});
			const saved = game.save();
			game.step(120);
			expect(game.save()).toBe(saved);
			restored = await createDefenseSession({ saved });
			restored.step(120);
			expect(restored.save()).toBe(saved);
			const choice = restored
				.snapshot()
				.choices.find((key) => key !== "snowfall" && key !== "portal")!;
			expect(restored.choose(choice)).toBe(true);
			expect(restored.choose(choice)).toBe(false);
			expect(restored.expand("limit")).toBe(true);
			expect(restored.startWave()).toBe(true);
			expect(restored.snapshot().wave).toBe(wave + 1);
		} finally {
			await game.destroy();
			await restored?.destroy();
		}
	},
);

it("continues growing an owned joker after all six slots are filled", async () => {
	const assembly = await createDefenseWorld(
		"late-reward",
		structuredClone(classicMap),
	);
	const run = assembly.world.getFirstComponent(Run)!;
	Object.assign(run, { phase: "wave", wave: 51, remaining: 0, coins: 1000 });
	Object.assign(run.bonuses, {
		power: 40,
		charge: 20,
		execution: 1,
		solitude: 10,
		auraPower: 10,
		crossfire: 10,
	});
	const game = createSessionRuntime(assembly);
	try {
		game.step();
		expect(game.snapshot().choices).toEqual([]);
		expect(game.continue()).toBe(true);
		run.shop = ["power"];
		const restored = await createDefenseSession({ saved: game.save() });
		try {
			expect(restored.buy("power")).toBe(true);
			expect(restored.snapshot().bonuses.power).toBe(41);
			expect(restored.startWave()).toBe(true);
		} finally {
			await restored.destroy();
		}
	} finally {
		await game.destroy();
	}
});

it("cycles enemy compositions with bounded population and recurring bosses", () => {
	for (const wave of [6, 11, 51, 501]) {
		expect(waveAt(wave).enemies.length).toBeGreaterThan(8);
		expect(waveAt(wave).enemies.length).toBeLessThanOrEqual(32);
		expect(waveAt(wave).enemies).not.toContain("boss");
		expect(waveAt(wave + 4).enemies).toContain("boss");
	}
});

it("resumes a legacy victory at wave six without paying the old wave twice", async () => {
	const game = await createDefenseSession({ seed: "legacy" });
	let restored: Awaited<ReturnType<typeof createDefenseSession>> | undefined;
	try {
		game.chooseStarter("volley");
		const saved = JSON.parse(game.save());
		Object.assign(saved.state, { phase: "won", wave: 5 });
		restored = await createDefenseSession({ saved: JSON.stringify(saved) });
		expect(restored.snapshot()).toMatchObject({
			phase: "prepare",
			coins: saved.state.coins,
		});
		expect(restored.startWave()).toBe(true);
		expect(restored.snapshot().wave).toBe(6);
	} finally {
		await game.destroy();
		await restored?.destroy();
	}
});
