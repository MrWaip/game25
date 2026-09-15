import { starterChoices } from "@/games/defense/rewards";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { RunScreen } from "@/games/defense/runScreen";
import { createClassicSession as createDefenseSession } from "@/games/defense/testkit/classicSession";

beforeEach(() => {
	// Real DOM, layout, controls and session; only Canvas drawing is substituted.
	const ctx = {
		globalAlpha: 1,
		measureText: (text: string) => ({ width: text.length * 7 }),
		createRadialGradient: () => ({ addColorStop() {} }),
	};
	for (const name of [
		"save",
		"restore",
		"setTransform",
		"clearRect",
		"scale",
		"translate",
		"fillRect",
		"strokeRect",
		"fillText",
		"beginPath",
		"closePath",
		"moveTo",
		"lineTo",
		"stroke",
		"fill",
		"setLineDash",
		"arc",
		"ellipse",
		"roundRect",
		"rect",
		"clip",
	])
		Object.assign(ctx, { [name]: () => {} });
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
		ctx as unknown as CanvasRenderingContext2D,
	);
	vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(336);
});
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
	try {
		for (const cleanup of cleanups.splice(0)) await cleanup();
	} finally {
		vi.restoreAllMocks();
	}
});

async function setup(onSave = vi.fn<(saved: string) => void>()) {
	const seed = Array.from({ length: 100 }, (_, i) => `screen-${i}`).find(
		(seed) =>
			["winter", "volley"].every((key) =>
				starterChoices(seed).includes(key as "winter" | "volley"),
			),
	)!;
	const session = await createDefenseSession({ seed });
	const root = document.createElement("section");
	document.body.append(root);
	const onSaveError = vi.fn();
	const screen = new RunScreen(root, session, { onSave, onSaveError });
	cleanups.push(async () => {
		try {
			screen.destroy();
		} finally {
			await session.destroy();
			root.remove();
		}
	});
	const button = (selector: string) => {
		const found = root.querySelector<HTMLButtonElement>(selector);
		expect(found).not.toBeNull();
		return found!;
	};
	screen.sync(false);
	onSave.mockClear();
	return { session, root, screen, button, onSave, onSaveError };
}

it("saves actions before presenting the result and blocks stale input during pause", async () => {
	const { session, root, screen, button, onSave } = await setup();
	const draft = button('[data-ui-id="reward-volley"]');
	expect(document.activeElement).toBe(button(".defense-reward-screen button"));
	expect(root.querySelector<HTMLElement>(".defense-board")!.inert).toBe(true);
	draft.click();
	expect(session.snapshot().phase).toBe("prepare");
	expect(onSave).toHaveBeenCalledTimes(1);
	expect(root.querySelector<HTMLElement>(".defense-board")!.inert).toBe(false);
	button('[aria-label="Клетка 9"]').click();
	let displayedAtSave = "";
	onSave.mockImplementation(() => {
		displayedAtSave = root.querySelector(".defense-status")!.textContent!;
	});
	const build = button('[data-ui-id="build-rapid"]');
	const staleAction = () => build.click();
	build.click();
	expect(displayedAtSave).toContain("90");
	expect(root.querySelector(".defense-status")!.textContent).toContain("60");
	expect(session.snapshot().towers).toMatchObject([{ slot: 8, kind: "rapid" }]);
	const restored = await createDefenseSession({
		saved: onSave.mock.lastCall![0],
	});
	try {
		expect(restored.snapshot().towers).toEqual(session.snapshot().towers);
	} finally {
		await restored.destroy();
	}
	screen.sync(true);
	const before = session.snapshot();
	const saves = onSave.mock.calls.length;
	staleAction();
	session.step(60);
	screen.advance(10);
	expect(session.snapshot()).toEqual(before);
	expect(onSave).toHaveBeenCalledTimes(saves);
	expect(root.querySelector(".defense-status")!.textContent).toContain("Пауза");
	screen.sync(false);
	expect(button('[data-ui-id="sell"]').disabled).toBe(false);
});

it("presents and saves a completed wave, then applies a reward through the same screen", async () => {
	const { session, root, screen, button, onSave } = await setup();
	button('[data-ui-id="reward-winter"]').click();
	// Arrange a real defended wave through session commands.
	session.placeSnow(16);
	session.build(8, "rapid");
	session.build(10, "arcane");
	session.build(22, "blast");
	session.startWave();
	screen.advance(1 / 60);
	const controls = root.querySelector(".defense-controls")!.firstChild;
	session.step();
	screen.advance(1 / 60);
	expect(root.querySelector(".defense-controls")!.firstChild).toBe(controls);
	session.step(3600);
	expect(session.snapshot().phase).toBe("reward");
	const saves = onSave.mock.calls.length;
	screen.advance(1 / 60);
	expect(onSave).toHaveBeenCalledTimes(saves + 1);
	const overlay = root.querySelector<HTMLElement>(".defense-reward-screen")!;
	expect(overlay.hidden).toBe(false);
	expect(overlay.contains(document.activeElement)).toBe(true);
	expect(root.querySelector<HTMLElement>(".defense-controls")!.inert).toBe(
		true,
	);
	button('[data-ui-id="reward-portal"]').click();
	expect(session.snapshot()).toMatchObject({
		phase: "prepare",
		pendingWorld: "portal",
	});
	expect(overlay.hidden).toBe(true);
	expect(root.querySelector(".defense-controls")!.textContent).toContain(
		"ВХОД",
	);
	expect(onSave).toHaveBeenCalledTimes(saves + 2);
});

it("refreshes after a failed save, retries on the clock and saves once on teardown", async () => {
	const error = new Error("Storage full");
	const onSave = vi.fn<(saved: string) => void>().mockImplementation(() => {
		throw error;
	});
	const { session, root, screen, button, onSaveError } = await setup(onSave);
	button('[data-ui-id="reward-volley"]').click();
	expect(session.snapshot().phase).toBe("prepare");
	expect(
		root.querySelector<HTMLElement>(".defense-reward-screen")!.hidden,
	).toBe(true);
	const warning = root.querySelector<HTMLElement>(".defense-save-error")!;
	expect(warning.hidden).toBe(false);
	expect(onSaveError).toHaveBeenCalledWith(error);
	onSave.mockImplementation(() => {});
	screen.advance(4);
	expect(warning.hidden).toBe(false);
	screen.advance(1);
	expect(warning.hidden).toBe(true);
	const saves = onSave.mock.calls.length;
	screen.destroy();
	screen.destroy();
	screen.persist();
	expect(onSave).toHaveBeenCalledTimes(saves + 1);
});
