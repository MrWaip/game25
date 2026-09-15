import type { AudioName } from "@/games/jumper/assets";
import type { Entity } from "@/entities/entity";
import type { Vec2 } from "@/primitives/vec2-gl";

export type GameEvents = {
	trigger: {
		initiator: Entity;
		target: Entity;
	};
	collision: {
		initiator: Entity;
		target: Entity;
		normal: Vec2;
		time: number;
	};
	death: {
		entity: Entity;
	};
	audioPlay: {
		name: AudioName;
		loop?: boolean;
		volume?: number;
	};
	coinCollected: {
		coin: Entity;
		player: Entity;
	};
	countersUpdated: {
		coins: number;
		height: number;
		falls: number;
	};
};
