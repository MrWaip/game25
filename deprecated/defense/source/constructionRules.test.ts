import { expect, it } from "vite-plus/test";
import { createDefenseWorld } from "@/games/defense/setup";
import { createSessionRuntime } from "@/games/defense/sessionRuntime";
import { createDefenseSession } from "@/games/defense/session";
import { Run } from "@/games/defense/components/runComponent";
import { DefenseController } from "@/games/defense/controller";
import { distanceToRoad, type DefenseMap } from "@/games/defense/board";
import { isConstructionSite } from "@/games/defense/constructionRules";

const map: DefenseMap = {
	columns: 11,
	rows: 15,
	paths: [
		[
			{ x: 24, y: 0 },
			{ x: 24, y: 720 },
		],
	],
};

it("opens the two-cell strip along the road to every tower kind", async () => {
	const assembly = await createDefenseWorld("sites", map);
	Object.assign(assembly.world.getFirstComponent(Run)!, {
		phase: "prepare",
		sites: [56, 57, 58],
		openSites: 3,
	});
	const game = createSessionRuntime(assembly);
	try {
		const controller = new DefenseController(game);
		expect(distanceToRoad(map, 61)).toBe(288);
		expect(isConstructionSite(map, 61)).toBe(false);
		expect(controller.present().cells[61]).toBe(false);
		expect(game.build(61, "blast")).toBe(false);
		expect(game.snapshot().coins).toBe(90);
		expect(isConstructionSite(map, 57)).toBe(true);
		controller.selectTower("frost");
		expect(controller.present().cells[57]).toBe(true);
		expect(game.build(57, "frost")).toBe(true);
		expect(game.build(56, "blast")).toBe(true);
		expect(game.relocate(56, 58)).toBe(false);
		expect(game.relocate(56, 57)).toBe(true);
		expect(game.snapshot().towers.map((t) => t.slot)).toEqual([56, 57]);
	} finally {
		await game.destroy();
	}
});

it("keeps old out-of-range towers accessible and lets the player move them to a useful site", async () => {
	const assembly = await createDefenseWorld("old-sites", map);
	assembly.world.getFirstComponent(Run)!.phase = "prepare";
	const original = createSessionRuntime(assembly);
	const raw = JSON.parse(original.save());
	raw.version = 6;
	raw.state.towers = [{ slot: 61, kind: "rapid", level: 1, cooldown: 0 }];
	await original.destroy();
	const game = await createDefenseSession({ saved: JSON.stringify(raw) });
	try {
		const controller = new DefenseController(game);
		expect(controller.present().cells[61]).toBe(true);
		controller.selectCell(61);
		expect(
			controller.present().actions.some((action) => action.id === "sell"),
		).toBe(true);
		const destination = game
			.snapshot()
			.sites.slice(0, game.snapshot().openSites)
			.find((site) => isConstructionSite(map, site, "rapid"))!;
		expect(game.relocate(61, destination)).toBe(true);
		expect(game.snapshot().towers[0].slot).toBe(destination);
	} finally {
		await game.destroy();
	}
});
