import { Vec2 } from "@/primitives/vec2-gl";
import { createPlayer } from "@/games/jumper/entities/player";
import { createWall } from "@/games/jumper/entities/wall";
import type { JumperWorld } from "@/games/jumper/world";
import { Screen } from "@/core/screen";
import { createBackground } from "@/games/jumper/entities/background";
import { createCamera } from "@/games/jumper/entities/camera";
import { createPlatformSpawner } from "@/games/jumper/entities/platformSpawner";
import { createCounter } from "@/games/jumper/entities/counter";
import { createPlatform } from "@/games/jumper/entities/platform";
import { createFPS } from "@/games/jumper/entities/fps";
import { GAME_CONSTANTS } from "@/games/jumper/constants";
import { createRocketBooster } from "@/games/jumper/entities/rocketBooster";

export function populateJumper(world: JumperWorld, screen: Screen): void {
	const worldSize = screen.getWorldSize();
	const worldWidth = worldSize[0];

	world.addEntity(createBackground(screen.size));
	world.addEntity(createCounter(screen.size));
	world.addEntity(createFPS(screen.size));

	const startPlayerPos = Vec2.fromValues(
		worldWidth / 2,
		GAME_CONSTANTS.PLAYER_START_Y,
	);
	const player = world.addEntity(createPlayer(startPlayerPos));

	world.addEntity(
		createPlatform({
			kind: "default",
			position: Vec2.clone(startPlayerPos),
		}),
	);

	world.addEntity(
		createRocketBooster({
			position: Vec2.fromValues(100, 50),
		}),
	);

	const cameraPos = Vec2.create();
	Vec2.set(cameraPos, worldWidth / 2, screen.orthographicSize);
	world.addEntity(
		createCamera({
			followFor: player,
			highestY: screen.orthographicSize,
			position: cameraPos,
			zoom: 1,
		}),
	);

	world.addEntity(createPlatformSpawner(worldSize));

	createWalls(world, screen);
}

function createWalls(world: JumperWorld, screen: Screen): void {
	const worldSize = screen.getWorldSize();
	const worldWidth = worldSize[0];
	const worldHeight = worldSize[1];
	const wallHeight = worldHeight + GAME_CONSTANTS.WALL_HEIGHT_OFFSET;
	const wallThickness = GAME_CONSTANTS.WALL_THICKNESS;
	const halfWorldHeight = worldHeight / 2;

	world.addEntity(
		createWall({
			size: Vec2.fromValues(wallThickness, wallHeight),
			position: Vec2.fromValues(wallThickness / 2, halfWorldHeight),
			followCameraY: true,
		}),
	);

	world.addEntity(
		createWall({
			size: Vec2.fromValues(wallThickness, wallHeight),
			position: Vec2.fromValues(
				worldWidth - wallThickness / 2,
				halfWorldHeight,
			),
			followCameraY: true,
		}),
	);

	world.addEntity(
		createWall({
			size: Vec2.fromValues(worldWidth, wallThickness),
			position: Vec2.fromValues(worldWidth / 2, wallThickness / 2),
		}),
	);
}
