import { getProgress, publish, type DefenseEventOptions } from "./events";
import { totalWaves, waveDefinition } from "./definitions/campaign";
import { sitesFor } from "./board";
import { loadRun, saveRun } from "./save";
import { BattleSystem } from "./systems/battleSystem";
import { World } from "@/core/world";
import { Run } from "./components/runComponent";
import type {
	TowerKind,
	TowerDefinition,
	SpecializationId,
	RelicId,
} from "./model";
import { towers, towerSalePrice } from "./definitions/towers";
import { balance } from "./config";
import { activeRelics } from "./effects/relicEffects";

export async function createDefenseSession(
	options: { seed?: string; saved?: string } & DefenseEventOptions = {},
) {
	const world = new World({});
	world.registerComponent(Run);
	const run = options.saved
		? loadRun(options.saved)
		: new Run(options.seed ?? crypto.randomUUID());
	world.addEntity([run]);
	world.registerSystem(new BattleSystem());
	await world.initialize();
	let paused = false;
	let destroyed = false;
	return {
		restart(seed: string = crypto.randomUUID()) {
			if (paused || destroyed) return false;
			Object.assign(run, new Run(seed));
			return true;
		},
		getProgress: () => getProgress(run),
		pause() {
			paused = true;
		},
		resume() {
			if (!destroyed) paused = false;
		},
		save: () => saveRun(run),
		snapshot: () => structuredClone({ ...run, sites: sitesFor(run.level) }),
		startWave() {
			if (paused || destroyed) return false;
			if (
				run.phase !== "ready" &&
				run.phase !== "prepare" &&
				run.phase !== "won"
			)
				return false;
			run.phase = "wave";
			run.wave++;
			run.remaining = waveDefinition(run.wave).count;
			run.spawnIn = 0;
			if (run.wave === 1) publish(run, "runStarted", options);
			return true;
		},
		build(slot: number, kind: TowerKind) {
			if (paused || destroyed) return false;
			// Construction takes battle time, so it only happens inside a wave.
			if (run.phase !== "wave") return false;
			if (
				slot < 0 ||
				slot >= sitesFor(run.level).length ||
				run.towers.some((t) => t.slot === slot)
			)
				return false;
			const price = towers[kind]?.price;
			if (!price || run.coins < price) return false;
			run.coins -= price;
			run.coinsSpent += price;
			const relics = activeRelics(run.relics);
			const rushed = relics.includes("rush");
			run.towers.push({
				slot,
				kind,
				level: 1,
				specialization: null,
				cooldown: 0,
				construction: rushed ? 0 : balance.constructionSeconds,
				constructionKind: rushed ? null : "build",
				shots: 0,
				rate: relics.includes("brigade") && run.enemies.length ? 1.25 : 1,
				rushed: rushed ? balance.rushSeconds : 0,
				order: run.nextOrder++,
			});
			run.towersBuilt++;
			return true;
		},
		sell(slot: number) {
			if (paused || destroyed || run.phase !== "wave") return false;
			const tower = run.towers.find((tower) => tower.slot === slot);
			if (!tower) return false;
			run.coins += towerSalePrice(tower);
			run.towers = run.towers.filter((candidate) => candidate !== tower);
			return true;
		},
		relocate(from: number, to: number) {
			if (paused || destroyed || run.phase !== "wave") return false;
			const tower = run.towers.find((t) => t.slot === from);
			if (!tower || from === to || !sitesFor(run.level)[to]) return false;
			const other = run.towers.find((t) => t.slot === to);
			tower.slot = to;
			if (other) other.slot = from;
			if (!activeRelics(run.relics).includes("nomad"))
				for (const moved of other ? [tower, other] : [tower]) {
					moved.construction = balance.constructionSeconds;
					moved.constructionKind = "build";
					moved.order = run.nextOrder++;
				}
			return true;
		},
		choose(relic: RelicId, discard?: RelicId) {
			if (paused || destroyed) return false;
			if (run.phase !== "reward" || !run.offers.includes(relic)) return false;
			// A full bar trades one relic for another; nothing is taken for free.
			if (run.relics.length >= balance.relicSlots) {
				if (discard === undefined || !run.relics.includes(discard))
					return false;
				run.relics = run.relics.filter((owned) => owned !== discard);
				if (discard === "piggy") {
					run.coins += run.piggyCoins;
					run.coinsEarned += run.piggyCoins;
					run.piggyCoins = 0;
				}
			}
			run.relics.push(relic);
			run.offers = [];
			run.phase = run.wave === totalWaves ? "won" : "prepare";
			run.level = Math.floor(run.wave / 3) + 1;
			return true;
		},
		shiftRelic(relic: RelicId, step: -1 | 1) {
			if (paused || destroyed) return false;
			const from = run.relics.indexOf(relic),
				to = from + step;
			if (from < 0 || to < 0 || to >= run.relics.length) return false;
			[run.relics[from], run.relics[to]] = [run.relics[to], run.relics[from]];
			return true;
		},
		continue() {
			if (paused || destroyed) return false;
			if (run.phase !== "reward") return false;
			run.offers = [];
			run.phase = run.wave === totalWaves ? "won" : "prepare";
			run.level = Math.floor(run.wave / 3) + 1;
			return true;
		},
		improve(slot: number) {
			if (paused || destroyed) return false;
			if (run.phase !== "wave") return false;
			const tower = run.towers.find((t) => t.slot === slot);
			if (!tower || tower.level !== 1 || tower.construction > 0) return false;
			const cost = towers[tower.kind].upgradePrice;
			if (run.coins < cost) return false;
			run.coins -= cost;
			run.coinsSpent += cost;
			tower.level = 2;
			tower.construction = balance.constructionSeconds;
			tower.constructionKind = "upgrade";
			tower.order = run.nextOrder++;
			return true;
		},
		specialize(slot: number, choice: SpecializationId) {
			if (paused || destroyed) return false;
			if (run.phase !== "wave") return false;
			const tower = run.towers.find((t) => t.slot === slot);
			if (!tower || tower.level !== 2 || tower.construction > 0) return false;
			const definition: TowerDefinition = towers[tower.kind];
			if (
				!definition.specializations.some((s) => s.id === choice) ||
				run.coins < definition.specializationPrice
			)
				return false;
			run.coins -= definition.specializationPrice;
			run.coinsSpent += definition.specializationPrice;
			tower.level = 3;
			tower.specialization = choice;
			tower.construction = balance.constructionSeconds;
			tower.constructionKind = "upgrade";
			tower.order = run.nextOrder++;
			return true;
		},
		step(frames = 1) {
			for (let i = 0; i < frames && !paused && !destroyed; i++) {
				const before = run.phase;
				world.fixedUpdate(1 / 60);
				if (before === "wave" && run.phase === "reward")
					publish(run, "waveCompleted", options);
				if (before === "wave" && run.phase === "falling")
					publish(run, "runLost", options);
			}
		},
		destroy() {
			destroyed = true;
			return world.destroy();
		},
	};
}
export type DefenseSession = Awaited<ReturnType<typeof createDefenseSession>>;

export type DefenseSnapshot = ReturnType<DefenseSession["snapshot"]>;
