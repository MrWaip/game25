import coin from "@/games/jumper/assets/sprites/coin.png";
import terrain from "@/games/jumper/assets/sprites/terrain.png";
import ozonBg from "@/games/jumper/assets/sprites/winterBg.png";
import cardIdle from "@/games/jumper/assets/sprites/cardIdle.png";
import cardRun from "@/games/jumper/assets/sprites/cardRun.png";
import cardJump from "@/games/jumper/assets/sprites/cardJump.png";
import whitePlatform from "@/games/jumper/assets/sprites/platform.png";
import icedPlatform from "@/games/jumper/assets/sprites/icedPlatform.png";

import coinPickup from "@/games/jumper/assets/audio/coin.wav";
import background from "@/games/jumper/assets/audio/background.mp3";
import jump from "@/games/jumper/assets/audio/jump.wav";
import hurt from "@/games/jumper/assets/audio/hurt.wav";
import rocketFly from "@/games/jumper/assets/sprites/rocket-fly.png";
import rocketBooster from "@/games/jumper/assets/sprites/rocket-booster.png";
import flyingSleighReindeerHarnessSnap from "@/games/jumper/assets/sprites/flyingSleighReindeerHarnessSnap.png";

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
