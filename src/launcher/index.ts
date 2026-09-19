import type {
	DefenseEventOptions,
	DefenseProgress,
} from "@/games/defense/events";
export type {
	DefenseEvent,
	DefenseProgress,
	DefenseEventOptions,
} from "@/games/defense/events";
import { applyTheme } from "@/ui/theme";
export type GameId = "jumper" | "defense";
type MountedGame = {
	getProgress?(): DefenseProgress;
	pause(): void;
	resume(): void;
	destroy(): Promise<void>;
};
const saveKey = "game25:defense:v1";

export async function mountArcade(
	node: HTMLElement,
	options: { game?: GameId; seed?: string } & DefenseEventOptions = {},
) {
	const root = document.createElement("main");
	root.className = "arcade";
	applyTheme(root);
	const toolbar = document.createElement("nav");
	toolbar.className = "arcade-toolbar";
	const stage = document.createElement("div");
	stage.className = "arcade-stage";
	const notice = document.createElement("p");
	notice.setAttribute("role", "status");
	notice.hidden = true;
	root.append(toolbar, notice, stage);
	node.append(root);
	let game: MountedGame | undefined;
	let current: GameId | undefined;
	let paused = false;
	let destroyed = false;
	let pending = Promise.resolve();
	let destruction: Promise<void> | undefined;
	function showNotice(message: string) {
		notice.textContent = message;
		notice.hidden = false;
	}
	function saveFailed() {
		showNotice(
			"Не удалось сохранить забег. Последние изменения могут быть потеряны.",
		);
	}
	function button(label: string, action: () => void) {
		const element = document.createElement("button");
		element.textContent = label;
		element.onclick = action;
		toolbar.append(element);
		return element;
	}
	function readSave(): string | undefined {
		try {
			return localStorage.getItem(saveKey) ?? undefined;
		} catch {
			return undefined;
		}
	}
	function writeSave(saved: string) {
		localStorage.setItem(saveKey, saved);
	}
	function clearSave() {
		try {
			localStorage.removeItem(saveKey);
		} catch {
			/* Storage is optional. */
		}
	}
	async function load(id: GameId, fresh = false) {
		notice.hidden = true;
		try {
			await game?.destroy();
		} catch {
			showNotice("Не удалось полностью завершить предыдущую игру.");
		}
		game = undefined;
		stage.replaceChildren();
		current = id;
		paused = false;
		pause.textContent = "Пауза";
		if (fresh) clearSave();
		if (id === "defense") {
			const { mountDefense } = await import("@/games/defense/browser");
			const { InvalidSaveError } = await import("@/games/defense/save");
			const saved = readSave();
			try {
				game = await mountDefense(stage, {
					seed: fresh ? undefined : options.seed,
					saved,
					onEvent: options.onEvent,
					onEventError: options.onEventError,
					onSave: writeSave,
					onSaveError: saveFailed,
				});
			} catch (error) {
				if (!saved || !(error instanceof InvalidSaveError)) throw error;
				clearSave();
				game = await mountDefense(stage, {
					seed: fresh ? undefined : options.seed,
					onEvent: options.onEvent,
					onEventError: options.onEventError,
					onSave: writeSave,
					onSaveError: saveFailed,
				});
				showNotice("Не удалось прочитать сохранение. Начат новый забег.");
			}
		} else {
			const { createGame } = await import("@/games/jumper");
			const width = stage.clientWidth || window.innerWidth;
			const height = stage.clientHeight || window.innerHeight - 60;
			const touch =
				navigator.maxTouchPoints > 0 ||
				(window.matchMedia?.("(pointer: coarse)").matches ?? false);
			game = await createGame({
				node: stage,
				seed: options.seed,
				inputMode: touch ? "touch" : "keyboard",
				screenSize: { width, height },
				orthographicSize: (height / 2) * (touch ? 1.5 : 1),
				pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
			});
		}
		if (destroyed) {
			await game.destroy();
			game = undefined;
		}
	}
	function select(id: GameId, fresh = false) {
		pending = pending.then(async () => {
			if (destroyed) return;
			for (const element of toolbar.querySelectorAll("button"))
				element.disabled = true;
			try {
				await load(id, fresh);
			} catch (error) {
				console.error("Game startup failed", error);
				stage.textContent =
					"Не удалось запустить игру. Попробуй выбрать её ещё раз.";
			} finally {
				for (const element of toolbar.querySelectorAll("button"))
					element.disabled = false;
			}
		});
		return pending;
	}
	button("Платформер", () => {
		void select("jumper");
	});
	button("Оборона", () => {
		void select("defense");
	});
	const pause = button("Пауза", () => {
		if (!game) return;
		paused = !paused;
		if (paused) game.pause();
		else game.resume();
		pause.textContent = paused ? "Продолжить" : "Пауза";
	});
	button("Заново", () => {
		if (current) void select(current, true);
	});
	await select(options.game ?? "defense");
	return {
		getProgress: () =>
			!destroyed && current === "defense"
				? (game?.getProgress?.() ?? null)
				: null,
		destroy(): Promise<void> {
			destroyed = true;
			return (destruction ??= (async () => {
				try {
					await pending;
					await game?.destroy();
				} finally {
					root.remove();
				}
			})());
		},
	};
}
