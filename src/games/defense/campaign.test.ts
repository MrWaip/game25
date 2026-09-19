import { pathLengthFor } from "./board";
import { enemies } from "./definitions/enemies";
import { test, expect } from "vite-plus/test";
import { createDefenseSession } from "./session";
import { balance } from "./config";

test("a build can complete all six chapters, retaining its towers and relics", async () => {
	const session = await createDefenseSession({ seed: "campaign-playthrough" });
	try {
		for (let wave = 1; wave <= 18; wave++) {
			expect(session.startWave()).toBe(true);
			// Allow a full traversal even when oil slows the tail of the wave.
			const frameLimit = Math.ceil(
				(pathLengthFor(session.snapshot().level) /
					(enemies.goblin.speed * 0.4) +
					120) *
					60,
			);
			for (
				let frame = 0;
				frame < frameLimit && session.getProgress().phase === "wave";
				frame += 60
			) {
				let state = session.snapshot();
				for (const tower of state.towers) {
					if (tower.level === 1) session.improve(tower.slot);
					if (tower.kind === "arrow") session.specialize(tower.slot, "fire");
				}
				state = session.snapshot();
				for (const slot of [
					0,
					1,
					7,
					6,
					4,
					2,
					8,
					9,
					3,
					5,
					...state.sites.slice(10).map((_, i) => i + 10),
				]) {
					session.build(
						slot,
						slot === 1 || slot === 8 || (slot >= 10 && (slot - 10) % 12 === 0)
							? "oil"
							: slot === 6
								? "stone"
								: "arrow",
					);
				}
				session.step(60);
			}
			const state = session.snapshot();
			expect(state.phase, `wave ${wave}, HP ${state.health}`).toBe("reward");
			if (state.offers.length)
				session.choose(
					state.offers[0],
					state.relics.length >= balance.relicSlots
						? state.relics[0]
						: undefined,
				);
			else session.continue();
		}
		expect(session.snapshot().phase).toBe("won");
		expect(session.snapshot().relics).toHaveLength(balance.relicSlots);
		expect(session.snapshot().towers[0].slot).toBe(0);
	} finally {
		await session.destroy();
	}
}, 60000);

test("victory opens an endless continuation that keeps the build and cycles biomes", async () => {
	const { levelDefinition, totalWaves, waveDefinition } =
		await import("./definitions/campaign");
	const last = waveDefinition(totalWaves);
	const beyond = waveDefinition(totalWaves + 1);
	expect(beyond.assaults[0].health).toBeGreaterThan(last.assaults[0].health);
	expect(waveDefinition(totalWaves + 12).count).toBeGreaterThan(0);
	expect(levelDefinition(7).biome).toBe(levelDefinition(1).biome);
	expect(levelDefinition(7).chapter).toBe(7);

	const session = await createDefenseSession({ seed: "endless" });
	try {
		const state = session.snapshot();
		state.wave = totalWaves;
		state.phase = "reward";
		state.offers = [];
		state.remaining = 0;
		const won = await createDefenseSession({
			saved: JSON.stringify({ version: "gdd-6", run: state }),
		});
		try {
			expect(won.continue()).toBe(true);
			expect(won.snapshot().phase).toBe("won");
			expect(won.startWave()).toBe(true);
			expect(won.snapshot().wave).toBe(totalWaves + 1);
			expect(won.snapshot().level).toBe(7);
			expect(won.snapshot().sites.length).toBeGreaterThan(state.sites.length);
			const resumed = await createDefenseSession({ saved: won.save() });
			expect(resumed.snapshot().wave).toBe(totalWaves + 1);
			await resumed.destroy();
		} finally {
			await won.destroy();
		}
	} finally {
		await session.destroy();
	}
});
