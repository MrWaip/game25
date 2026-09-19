import { createCanvas, type CanvasElement } from "@/render/canvas";
import { applyTheme } from "@/ui/theme";
import {
	audio,
	sprites,
	type SpriteName,
	type AudioName,
} from "@/games/jumper/assets";
import { AssetsManager } from "@/core/assetsManager";
import { Engine } from "@/core/engine";
import { mountBrowserGame } from "@/core/browserGame";
import { Screen } from "@/core/screen";
import { JumperWorld } from "@/games/jumper/world";
import { CanvasRenderer } from "@/render/renderer";
import { AudioPlayer } from "@/systems/audioPlayer";
import {
	KeyboardInputStrategy,
	MultiTouchZonesInputStrategy,
	type InputStrategy,
} from "@/games/jumper/input";
import { Vec2 } from "@/primitives/vec2-gl";
import { populateJumper } from "@/games/jumper/setup";
import { Random } from "@/primitives/random";
import {
	registerJumperComponents,
	registerJumperSystems,
} from "@/games/jumper/register";
import type { GameEvents } from "@/games/jumper/events";

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
	pause(): void;
	resume(): void;
	destroy(): Promise<void>;
};

export function createGameWithTouchHints(
	root: HTMLElement,
	inputMode: GameOptions["inputMode"],
): CanvasElement {
	const canvas = createCanvas();
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
	const random = new Random(options.seed || "42");
	let destroyed = false;

	const container = document.createElement("div");
	container.className = "jumper-stage";
	applyTheme(container);
	options.node.appendChild(container);
	let engine!: Engine;
	const mounted = await mountBrowserGame(container, (defer) => {
		const canvas = createGameWithTouchHints(container, options.inputMode);
		const screenSize = Vec2.fromValues(
			options.screenSize.width,
			options.screenSize.height,
		);

		const pixelRatio = options.pixelRatio ?? 1;
		const screen = new Screen(screenSize, pixelRatio, options.orthographicSize);

		const world = new JumperWorld({ debug: options.debug });
		const assetsManager = new AssetsManager<SpriteName, AudioName>();
		engine = new Engine(world, assetsManager, screen, options.targetFps ?? 60);
		defer(() => engine.destroy());
		const renderer = new CanvasRenderer(canvas, assetsManager, screen);
		const audioPlayer = new AudioPlayer(assetsManager);
		let registered = false;
		defer(() => {
			if (!registered) audioPlayer.destroy();
		});
		let inputStrategy: InputStrategy;

		switch (options.inputMode) {
			case "touch":
				inputStrategy = new MultiTouchZonesInputStrategy(canvas);
				break;
			case "keyboard":
				inputStrategy = new KeyboardInputStrategy();
				break;
		}

		defer(() => {
			if (!registered) inputStrategy.destroy();
		});

		assetsManager.addSprites(sprites);
		assetsManager.addAudio(audio);

		registerJumperComponents(world);

		if (options.onEvent) {
			world.eventBus.onAll((event, payload) => {
				setTimeout(() => {
					if (!destroyed) options.onEvent!(event, payload);
				}, 0);
			});
		}

		populateJumper(world, screen);

		registerJumperSystems(world, {
			platformRandom: random.child("platform-spawn-system-position"),
			platformRandomSize: random.child("platform-spawn-system-size"),
			platformRandomRocket: random.child("platform-spawn-system-rocket"),
			rocketBoosterRandom: random.child("rocket-booster-system"),
			screen,
			inputStrategy: inputStrategy,
			renderer,
			audioPlayer,
			includeRender: true,
			includeAudio: true,
		});

		registered = true;
		defer(() => {
			destroyed = true;
		});
		let backgroundStarted = false;
		return {
			engine,
			sync(paused) {
				if (paused) audioPlayer.pauseAll();
				else {
					audioPlayer.resumeAll();
					if (!backgroundStarted) {
						backgroundStarted = true;
						world.eventBus.emit("audioPlay", {
							name: "background",
							loop: true,
							volume: 0.01,
						});
					}
				}
			},
		};
	});
	return { engine, ...mounted };
}
