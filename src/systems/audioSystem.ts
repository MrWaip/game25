import type { World } from "../core/world";
import type { GameEvents } from "../primitives/gameEvents";
import type { IAudioPlayer } from "./audioPlayer";
import type { ISystem } from "./system";

export class AudioSystem implements ISystem {
  #player: IAudioPlayer;

  constructor(player: IAudioPlayer) {
    this.#player = player;
  }

  initialize(world: World): Promise<void> | void {
    world.eventBus.on("audioPlay", (e) => this.onAudioPlay(world, e));

    if (document.hidden) {
      this.#player.pauseAll();
    }
  }

  onAudioPlay(_: World, event: GameEvents["audioPlay"]) {
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
