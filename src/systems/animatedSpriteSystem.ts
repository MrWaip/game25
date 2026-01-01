import {
	AnimationState,
	AnimationTable,
	AnimationTimer,
} from "../components/animationComponent";
import type { World } from "../core/world";
import type { ISystem } from "./system";

export class AnimatedSpriteSystem implements ISystem {
	update(world: World, dt: number) {
		for (const {
			entity,
			components: [timer, table, state],
		} of world.query(AnimationTimer, AnimationTable, AnimationState)) {
			const clip = table.clips[state.current];

			if (!clip) {
				console.warn(
					`Entity ${entity} has no animation for state: ${state.current}`,
				);
				continue;
			}

			const playIdChanged = state.playId !== state.lastAppliedPlayId;

			if (state.previous !== state.current || playIdChanged) {
				timer.frame = 0;
				timer.time = 0;
				timer.playing = true;
				state.previous = state.current;
				state.lastAppliedPlayId = state.playId;
			}

			if (!timer.playing) continue;

			timer.time += dt;

			while (timer.time >= clip.frameTime) {
				timer.time -= clip.frameTime;
				timer.frame++;

				if (timer.frame >= clip.frames) {
					if (clip.loop) {
						timer.frame = 0;
					} else {
						timer.frame = clip.frames - 1;
						timer.playing = false;
					}
				}
			}
		}
	}
}
