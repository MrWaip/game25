import { audio, sprites } from "../assets";
import { AssetsManager } from "../core/assetsManager";
import { Engine } from "../core/engine";
import { Screen } from "../core/screen";
import { World } from "../core/world";
import { CanvasRenderer } from "../render/renderer";
import { AudioPlayer } from "../systems/audioPlayer";
import {
	KeyboardInputStrategy,
	MultiTouchZonesInputStrategy,
	type InputStrategy,
} from "../input";
import { Vec2 } from "../primitives/vec2-gl";
import { GlobalRandom } from "../primitives/random";
import { registerGameComponents, registerGameSystems } from "../game/setup";
import type { GameEvents } from "../primitives/gameEvents";

export type GameEventListener = <K extends keyof GameEvents>(
	event: K,
	payload: GameEvents[K],
) => void;

type GameOptions = {
	node: HTMLElement;
	inputMode: "touch" | "keyboard";
	debug?: boolean;
	seed?: string;
	targetFps?: 30 | 60 | 144;
	screenSize: {
		width: number;
		height: number;
	};
	orthographicSize: number;
	pixelRatio?: number;
	onEvent?: GameEventListener;
};

type Result = {
	engine: Engine;
	destroy: VoidFunction;
};

export function createGameWithTouchHints(
	root: HTMLElement,
	inputMode: GameOptions["inputMode"],
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.id = "game";
	root.appendChild(canvas);

	if (inputMode === "touch") {
		const hints = document.createElement("div");
		hints.className = "touch-hints touch-hints--visible";
		root.appendChild(hints);

		const left = document.createElement("div");
		left.className = "touch-hint touch-hint--left";
		left.innerHTML = `<span class="touch-hint__icon">←</span>`;
		hints.appendChild(left);

		const center = document.createElement("div");
		center.className = "touch-hint touch-hint--center";
		center.innerHTML = `
      <span class="touch-hint__icon">⤒</span>
      <span class="touch-hint__label">Прыжок</span>
    `;
		hints.appendChild(center);

		const right = document.createElement("div");
		right.className = "touch-hint touch-hint--right";
		right.innerHTML = `<span class="touch-hint__icon">→</span>`;
		hints.appendChild(right);
	}

	return canvas;
}

export async function createGame(options: GameOptions): Promise<Result> {
	GlobalRandom.initialize(options.seed || "42");

	const canvas = createGameWithTouchHints(options.node, options.inputMode);
	const screenSize = Vec2.fromValues(
		options.screenSize.width,
		options.screenSize.height,
	);

	const pixelRatio = options.pixelRatio ?? 1;
	const screen = new Screen(screenSize, pixelRatio, options.orthographicSize);

	canvas.width = screen.bufferSize[0];
	canvas.height = screen.bufferSize[1];
	canvas.style.width = `${screen.size[0]}px`;
	canvas.style.height = `${screen.size[1]}px`;

	const world = new World({ debug: options.debug });
	const assetsManager = new AssetsManager();
	const renderer = new CanvasRenderer(canvas, assetsManager, screen);
	const audioPlayer = new AudioPlayer(assetsManager);
	let inputStategy: InputStrategy;

	switch (options.inputMode) {
		case "touch":
			inputStategy = new MultiTouchZonesInputStrategy(canvas);
			break;
		case "keyboard":
			inputStategy = new KeyboardInputStrategy();
			break;
	}

	assetsManager.addSprites(sprites);
	assetsManager.addAudio(audio);

	registerGameComponents(world);

	if (options.onEvent) {
		world.eventBus.onAll((event, payload) => {
			setTimeout(() => {
				options.onEvent!(event, payload);
			}, 0);
		});
	}

	registerGameSystems(world, {
		screen,
		inputStrategy: inputStategy,
		renderer,
		audioPlayer,
		includeRender: true,
		includeAudio: true,
	});

	const simulationHz = options.targetFps ?? 60;

	const engine = new Engine(world, assetsManager, screen, simulationHz);

	await engine.initialize();

	engine.start();

	function handleVisibility() {
		if (document.hidden) {
			audioPlayer.pauseAll();
		} else {
			audioPlayer.resumeAll();
		}
	}

	document.addEventListener("visibilitychange", handleVisibility);

	function destroy() {
		engine.destroy();
		document.removeEventListener("visibilitychange", handleVisibility);
	}

	return {
		engine,
		destroy,
	};
}
