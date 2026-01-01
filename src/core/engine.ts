import { Vec2 } from "../primitives/vec2-gl";
import { createPlayer } from "../entities/player";
import { createWall } from "../entities/wall";
import type { World } from "./world";
import type { AssetsManager } from "./assetsManager";
import { Screen } from "./screen";
import { createBackground } from "../entities/background";
import { createCamera } from "../entities/camera";
import { createPlatformSpawner } from "../entities/platformSpawner";
import { createCounter } from "../entities/counter";
import { createPlatform } from "../entities/platform";
import { createFPS } from "../entities/fps";
import type { GameEvents } from "../primitives/gameEvents";
import { createFixedTimestep } from "./fixedTimestep";
import { GAME_CONSTANTS } from "../game/constants";
import { createRocketBooster } from "../entities/rocketBooster";

type EngineEventBus = {
	emit<K extends keyof GameEvents>(
		event: K,
		...args: GameEvents[K] extends void ? [] : [GameEvents[K]]
	): void;
};

type EngineWorld = Pick<
	World,
	"addEntity" | "fixedUpdate" | "update" | "initialize" | "destroy"
> & {
	eventBus: EngineEventBus;
};

type EngineAssetsManager = Pick<AssetsManager, "initialize">;

export class Engine {
	#world: EngineWorld;
	#assetsManager: EngineAssetsManager;
	#stopped: boolean;
	#screen: Screen;
	#simulationHz: number;

	constructor(
		world: EngineWorld,
		assetsManager: EngineAssetsManager,
		screen: Screen,
		simulationHz: number,
	) {
		this.#world = world;
		this.#assetsManager = assetsManager;
		this.#stopped = false;
		this.#screen = screen;
		this.#simulationHz = simulationHz;
	}

	public async initialize(): Promise<void> {
		const worldSize = this.#screen.getWorldSize();
		const worldWidth = worldSize[0];

		this.#world.addEntity(createBackground(this.#screen.size));
		this.#world.addEntity(createCounter(this.#screen.size));
		this.#world.addEntity(createFPS(this.#screen.size));

		const startPlayerPos = Vec2.fromValues(
			worldWidth / 2,
			GAME_CONSTANTS.PLAYER_START_Y,
		);
		const player = this.#world.addEntity(createPlayer(startPlayerPos));

		this.#world.addEntity(
			createPlatform({
				kind: "default",
				position: Vec2.clone(startPlayerPos),
			}),
		);

		this.#world.addEntity(
			createRocketBooster({
				position: Vec2.fromValues(100, 50),
			}),
		);

		const cameraPos = Vec2.create();
		Vec2.set(cameraPos, worldWidth / 2, this.#screen.orthographicSize);
		this.#world.addEntity(
			createCamera({
				followFor: player,
				highestY: this.#screen.orthographicSize,
				position: cameraPos,
				zoom: 1,
			}),
		);

		this.#world.addEntity(createPlatformSpawner(worldSize));

		this.createWalls();

		await this.#assetsManager.initialize();
		await this.#world.initialize();

		this.#world.eventBus.emit("audioPlay", {
			name: "background",
			loop: true,
			volume: 0.01,
		});
	}

	private createWalls(): void {
		const worldSize = this.#screen.getWorldSize();
		const worldWidth = worldSize[0];
		const worldHeight = worldSize[1];
		const wallHeight = worldHeight + GAME_CONSTANTS.WALL_HEIGHT_OFFSET;
		const wallThickness = GAME_CONSTANTS.WALL_THICKNESS;
		const halfWorldHeight = worldHeight / 2;

		this.#world.addEntity(
			createWall({
				size: Vec2.fromValues(wallThickness, wallHeight),
				position: Vec2.fromValues(wallThickness / 2, halfWorldHeight),
				followCameraY: true,
			}),
		);

		this.#world.addEntity(
			createWall({
				size: Vec2.fromValues(wallThickness, wallHeight),
				position: Vec2.fromValues(
					worldWidth - wallThickness / 2,
					halfWorldHeight,
				),
				followCameraY: true,
			}),
		);

		this.#world.addEntity(
			createWall({
				size: Vec2.fromValues(worldWidth, wallThickness),
				position: Vec2.fromValues(worldWidth / 2, wallThickness / 2),
			}),
		);
	}

	public async destroy(): Promise<void> {
		this.#stopped = true;

		await this.#world.destroy();
	}

	public start(): void {
		const maxFrameTime = 0.25;
		const maxSubSteps = 10;
		const stepper = createFixedTimestep(
			{
				hz: this.#simulationHz,
				maxFrameTime,
				maxSubSteps,
			},
			performance.now(),
		);

		const loop = (currentTime: number) => {
			if (this.#stopped) return;

			const { steps, frameDt } = stepper.tick(currentTime);

			for (let i = 0; i < steps; i++) {
				this.#world.fixedUpdate(stepper.fixedDt);
			}

			this.#world.update(frameDt);

			requestAnimationFrame(loop);
		};

		requestAnimationFrame(loop);
	}
}
