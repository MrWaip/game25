import { expect, it, onTestFinished } from "vite-plus/test";
import { createDefenseWorld } from "@/games/defense/setup";
import { createSessionRuntime } from "@/games/defense/sessionRuntime";
import { createDefenseSession } from "@/games/defense/session";
import { Run } from "@/games/defense/components/runComponent";
import { isConstructionSite } from "@/games/defense/constructionRules";
import { ownedJokers, shopOffers } from "@/games/defense/shop";
import { connectedUpgrades, shopRole } from "@/games/defense/synergyRules";

async function runScenario() {
	const assembly = await createDefenseWorld("progression");
	const run = assembly.world.getFirstComponent(Run)!;
	run.coins = 1000;
	const game = createSessionRuntime(assembly);
	game.chooseStarter("artillery");
	onTestFinished(() => game.destroy());
	return { game, run };
}

it("every nearby cell is open, while money cannot bypass the tower cap", async () => {
	const { game, run } = await runScenario();
	const sites = run.sites.filter((site) =>
		isConstructionSite(run.map, site, "blast"),
	);
	expect(run.openSites).toBe(run.sites.length);
	for (const site of sites.slice(0, 4))
		expect(game.build(site, "blast")).toBe(true);
	expect(game.build(sites[4], "blast")).toBe(false);
	expect(game.expand("limit")).toBe(false);
	run.expansionDue = true;
	expect(game.startWave()).toBe(false);
	expect(game.expand("limit")).toBe(true);
	expect(game.build(sites[4], "blast")).toBe(true);
});

it("six joker slots require a sale, while an existing joker can grow in place", async () => {
	const { game, run } = await runScenario();
	for (const key of [
		"haste",
		"charge",
		"crossfire",
		"solitude",
		"auraPower",
	] as const) {
		run.shop = [key];
		expect(game.buy(key)).toBe(true);
	}
	expect(ownedJokers(game.snapshot().bonuses)).toHaveLength(6);
	run.shop = ["execution", "power"];
	expect(game.buy("execution")).toBe(false);
	expect(game.buy("power")).toBe(true);
	expect(game.snapshot().bonuses.power).toBe(2);
	expect(game.sellJoker("solitude")).toBe(true);
	expect(game.buy("execution")).toBe(true);
	expect(ownedJokers(game.snapshot().bonuses)).toHaveLength(6);
});

it("reserves a shop offer for a continuation of the current machine", async () => {
	const { run } = await runScenario();
	run.bonuses.charge = 1;
	for (let wave = 1; wave <= 20; wave++) {
		run.wave = wave;
		run.shopRoll = 0;
		run.shop = shopOffers(run);
		expect(
			run.shop.some((key) => connectedUpgrades(run.bonuses, key).length > 0),
		).toBe(true);
		expect(
			run.shop.some((key) => shopRole(run.bonuses, key) === "ПРОДОЛЖЕНИЕ"),
		).toBe(true);
	}
});

it("shop stock, held offer, specialization and command state survive reload", async () => {
	const { game, run } = await runScenario();
	const site = run.sites[0];
	expect(game.build(site, "rapid")).toBe(true);
	expect(game.improve(site)).toBe(true);
	expect(game.specialize(site, "spread")).toBe(true);
	expect(game.priority(site, "shield")).toBe(true);
	const offer = run.shop[0];
	expect(game.hold(offer)).toBe(true);
	expect(game.reroll()).toBe(true);
	expect(game.snapshot().shop).toContain(offer);
	game.startWave();
	game.overdrive(site);
	game.step(40);
	const restored = await createDefenseSession({ saved: game.save() });
	onTestFinished(() => restored.destroy());
	expect(restored.save()).toBe(game.save());
	game.step(80);
	restored.step(80);
	expect(restored.save()).toBe(game.save());
});

it("a completed boss grants one expansion and free choices; other waves refill only the shop", async () => {
	for (const wave of [1, 5]) {
		const { game, run } = await runScenario();
		Object.assign(run, { phase: "wave", wave, remaining: 0, overdrives: 2 });
		run.bonuses.reserve = 1;
		const before = run.coins;
		game.step();
		expect(game.snapshot().phase).toBe("reward");
		expect(game.snapshot().choices).toHaveLength(wave === 5 ? 3 : 0);
		expect(game.snapshot().shop).toHaveLength(3);
		expect(game.snapshot().expansionDue).toBe(wave === 5);
		expect(game.snapshot().coins - before).toBe(wave === 5 ? 147 : 47);
		game.step(20);
		expect(game.snapshot().coins - before).toBe(wave === 5 ? 147 : 47);
	}
});
