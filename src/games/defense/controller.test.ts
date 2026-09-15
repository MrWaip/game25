import { afterEach, describe, expect, it } from "vite-plus/test";
import { DefenseController } from "@/games/defense/controller";
import type { DefenseSession } from "@/games/defense/session";
import { createClassicSession as createDefenseSession } from "@/games/defense/testkit/classicSession";
import type { Starter } from "@/games/defense/config";

const sessions: DefenseSession[] = [];
afterEach(async () => {
	for (const session of sessions.splice(0)) await session.destroy();
});
async function setup(starter: Starter = "volley") {
	const session = await createDefenseSession({ seed: "test" });
	sessions.push(session);
	session.chooseStarter(starter);
	return { session, ui: new DefenseController(session) };
}

describe("construction interaction", () => {
	it("both selection orders build and present the actual tower range", async () => {
		const { session, ui } = await setup();
		ui.selectCell(8);
		ui.selectTower("rapid");
		expect(ui.present().board.range).toEqual({ cell: 8, radius: 96 });
		ui.act("cancel");
		ui.selectTower("arcane");
		ui.selectCell(10);
		expect(session.snapshot().towers.map((t) => [t.slot, t.kind])).toEqual([
			[8, "rapid"],
			[10, "arcane"],
		]);
		expect(ui.present().board.range).toEqual({ cell: 10, radius: 120 });
		expect(session.snapshot().coins).toBe(30);
	});

	it("tower selection exposes upgrade and sale while keeping launch available", async () => {
		const { session, ui } = await setup();
		ui.selectCell(8);
		ui.selectTower("rapid");
		expect(ui.present().actions.map((a) => a.id)).toEqual([
			"improve",
			"sell",
			"cancel",
		]);
		expect(ui.present().launch?.disabled).toBe(false);
		ui.act("improve");
		expect(session.snapshot().towers[0].level).toBe(2);
		expect(session.snapshot().coins).toBe(25);
		expect(ui.present().actions.find((a) => a.id === "sell")?.label).toBe(
			"Продать · +32",
		);
		ui.act("sell");
		expect(session.snapshot().coins).toBe(57);
		expect(session.snapshot().towers).toHaveLength(0);
	});
	it("disabled actions cannot be invoked through stale or direct input", async () => {
		const { session, ui } = await setup();
		for (const cell of [8, 9, 10]) {
			ui.selectCell(cell);
			ui.selectTower("rapid");
		}
		ui.act("replace");
		expect(ui.present().choices.every((c) => c.disabled)).toBe(true);
		const saved = session.save();
		ui.selectTower("arcane");
		ui.act("improve");
		ui.act("move");
		expect(session.save()).toBe(saved);
		ui.act("cancel");
		ui.act("startWave");
		ui.selectCell(8);
		ui.selectTower("frost");
		ui.act("move");
		expect(ui.present().actions).toEqual([]);
		expect(ui.present().choices).toHaveLength(4);
		expect(ui.present().choices.every((choice) => choice.disabled)).toBe(true);
		expect(ui.present().cells.some(Boolean)).toBe(false);
		expect(ui.present().board.selected).toBeNull();
	});
	it("snow preview, confirmation and mandatory placement stay in sync", async () => {
		const { session, ui } = await setup("winter");
		expect(ui.present().launch?.disabled).toBe(true);
		ui.act("cancel");
		ui.act("startWave");
		ui.selectTower("rapid");
		expect(session.snapshot().phase).toBe("prepare");
		expect(ui.present().choices).toHaveLength(4);
		expect(ui.present().choices.every((choice) => choice.disabled)).toBe(true);
		ui.selectCell(16);
		expect(ui.present().board.snow).toBe(16);
		expect(session.snapshot().snow).toBeNull();
		ui.act("placeWorld");
		expect(session.snapshot().snow).toBe(16);
		expect(ui.present().launch?.disabled).toBe(false);
	});
	it("portal exit always retains its entrance and rejects invalid destinations", async () => {
		const { session, ui } = await setup("rift");
		expect(ui.present().cells[8]).toBe(false);
		ui.selectCell(8);
		ui.act("placeWorld");
		expect(ui.present().board.portalEntrance).toBeNull();
		ui.selectCell(0);
		ui.act("placeWorld");
		expect(ui.present().cells.some(Boolean)).toBe(false);
		ui.act("portalBack");
		expect(ui.present().board.portalEntrance).toBeNull();
		ui.selectCell(20);
		ui.act("placeWorld");
		expect(ui.present().board.portalEntrance).toBe(20);
		expect(ui.present().cells[20]).toBe(false);
		ui.selectCell(20);
		ui.act("placeWorld");
		expect(session.snapshot().portal).toBeNull();
		expect(ui.present().cells[14]).toBe(true);
		ui.selectCell(14);
		ui.act("placeWorld");
		expect(session.snapshot().portal).toMatchObject({ entrance: 20, exit: 14 });
		expect(ui.present().board.portalEntrance).toBeNull();
	});
	it("phase changes and externally removed towers invalidate unfinished interactions", async () => {
		const { session, ui } = await setup();
		ui.selectCell(8);
		ui.selectTower("rapid");
		ui.act("move");
		session.sell(8);
		expect(ui.present().hint).toContain("Выбери башню");
		ui.selectCell(9);
		ui.selectTower("arcane");
		ui.act("replace");
		session.startWave();
		expect(ui.present().board.selected).toBeNull();
		expect(ui.present().choices).toHaveLength(4);
		expect(ui.present().choices.every((choice) => choice.disabled)).toBe(true);
	});
});
