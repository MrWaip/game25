import coin from "./sprites/coin.png";
import terrain from "./sprites/terrain.png";
import ozonBg from "./sprites/winterBg.png";
import cardIdle from "./sprites/cardIdle.png";
import cardRun from "./sprites/cardRun.png";
import cardJump from "./sprites/cardJump.png";
import whitePlatform from "./sprites/platform.png";
import icedPlatform from "./sprites/icedPlatform.png";

import coinPickup from "./audio/coin.wav";
import background from "./audio/background.mp3";
import jump from "./audio/jump.wav";
import hurt from "./audio/hurt.wav";
import rocketFly from "./sprites/rocket-fly.png";
import rocketBooster from "./sprites/rocket-booster.png";
import flyingSleighReindeerHarnessSnap from "./sprites/flyingSleighReindeerHarnessSnap.png";

export const sprites = {
	coin,
	terrain,
	ozonBg,
	cardIdle,
	cardRun,
	cardJump,
	whitePlatform,
	icedPlatform,
	rocketFly,
	rocketBooster,
	flyingSleighReindeerHarnessSnap,
} as const;

export const audio = {
	coinPickup,
	background,
	jump,
	hurt,
};

export type SpriteName = keyof typeof sprites;
export type AudioName = keyof typeof audio;
