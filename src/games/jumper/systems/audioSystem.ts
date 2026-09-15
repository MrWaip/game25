import type { SystemScope } from "@/systems/system";
import type { JumperWorld } from "@/games/jumper/world";
import type { GameEvents } from "@/games/jumper/events";
import type { IAudioPlayer } from "@/systems/audioPlayer";
import type { JumperSystem } from "@/games/jumper/world";

export class AudioSystem implements JumperSystem {
	#player: IAudioPlayer;

	constructor(player: IAudioPlayer) {
		this.#player = player;
	}

	initialize(world: JumperWorld, scope: SystemScope): Promise<void> | void {
		scope.on(world.eventBus, "audioPlay", (e) => this.onAudioPlay(world, e));

		if (document.hidden) {
			this.#player.pauseAll();
		}
	}

	onAudioPlay(_: JumperWorld, event: GameEvents["audioPlay"]) {
		void this.#player.play({
			name: event.name,
			volume: event.volume,
			loop: event.loop,
		});
	}

	destroy(): Promise<void> | void {
		this.#player.destroy();
	}
}
