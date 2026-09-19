import { expect, it } from "vite-plus/test";
import { createCombatScenario as scenario } from "@/games/defense/testkit/combatScenario";

it("a local amplifier accelerates an allied weapon without dealing damage", async () => {
	const game = await scenario({
		towers: [
			{ slot: 8, kind: "amplifier" },
			{ slot: 9, kind: "rapid" },
		],
		enemies: [{ speed: 0 }],
	});
	game.step();
	expect(game.snapshot().enemies[0].hp).toBe(94);
	expect(game.snapshot().towers[1].cooldown).toBeCloseTo(0.4 / 1.35);
	expect(game.snapshot().towers[0].shots ?? []).toHaveLength(0);
});

it("corrosion lets physical weapons overcome armor without an arcane tower", async () => {
	const game = await scenario({
		towers: [
			{ slot: 8, kind: "corrode" },
			{ slot: 9, kind: "rapid" },
		],
		enemies: [{ kind: "tank", speed: 0, hp: 1000, maxHp: 1000 }],
	});
	game.step(181);
	expect(game.snapshot().enemies[0].corrosion).toBeCloseTo(0.65);
	const before = game.snapshot().enemies[0].hp;
	game.step(24);
	expect(before - game.snapshot().enemies[0].hp).toBeGreaterThanOrEqual(6);
});
