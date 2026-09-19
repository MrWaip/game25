import { expect, it } from "vite-plus/test";
import { prepareBoardScene } from "@/games/defense/boardScene";
import { createCombatScenario } from "@/games/defense/testkit/combatScenario";
import { worldPoint } from "@/render/projection";
import type { BoardPreview } from "@/games/defense/interaction/model";

const idleView: BoardPreview = {
	selected: null,
	range: null,
	snow: null,
	portalEntrance: null,
};

it("prepares positions, health and statuses without exposing mutable combat state", async () => {
	const session = await createCombatScenario({
		towers: [{ slot: 1, kind: "rapid" }],
		enemies: [{ kind: "tank", hp: 25, maxHp: 100 }],
	});
	const snapshot = session.snapshot();
	const scene = prepareBoardScene(snapshot, {
		selected: 1,
		range: { cell: 1, radius: 96 },
		snow: null,
		portalEntrance: null,
	});
	expect(scene.towers[0].position).toEqual(worldPoint(72, 24));
	expect(scene.enemies[0]).toMatchObject({
		health: 0.25,
		badges: [{ label: "Физическая броня" }],
	});
	expect(scene.range).toEqual({ position: worldPoint(72, 24), radius: 96 });
	snapshot.enemies[0].hp = 0;
	expect(scene.enemies[0].health).toBe(0.25);
	expect(scene).not.toHaveProperty("bonuses");
});

it.each([
	{ phase: "prepare", coins: 90, allowed: true, shots: false },
	{ phase: "prepare", coins: 0, allowed: false, shots: false },
	{ phase: "wave", coins: 90, allowed: null, shots: true },
	{ phase: "reward", coins: 90, allowed: null, shots: false },
] as const)(
	"prepares placement and effects for $phase with $coins coins",
	async ({ phase, coins, allowed, shots }) => {
		const session = await createCombatScenario({
			towers: [{ slot: 2, kind: "rapid" }],
		});
		const snapshot = session.snapshot();
		snapshot.phase = phase;
		snapshot.coins = coins;
		snapshot.towers[0].shots = [{ x: 24, y: 72, life: 0.1 }];
		const before = structuredClone(snapshot);
		const scene = prepareBoardScene(snapshot, {
			...idleView,
			placement: { kind: "rapid", from: null, hover: 1 },
		});
		expect(scene.placement.find((cell) => cell.hover)?.allowed ?? null).toBe(
			allowed,
		);
		expect(scene.shots.length).toBe(shots ? 1 : 0);
		expect(snapshot).toEqual(before);
	},
);
