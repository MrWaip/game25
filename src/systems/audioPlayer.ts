import type { AudioName } from "../assets";
import type { AssetsManager } from "../core/assetsManager";

export interface IAudioPlayer {
	play(payload: PlayPayload): Promise<void> | void;
	pauseAll(): void;
	resumeAll(): void;
	destroy(): void;
}

type PlayPayload = {
	name: AudioName;
	loop?: boolean;
	volume?: number;
};

export class AudioPlayer implements IAudioPlayer {
	#assetsManager: AssetsManager;

	constructor(assetsManager: AssetsManager) {
		this.#assetsManager = assetsManager;
	}

	async play(payload: PlayPayload) {
		const ctx = await this.#assetsManager.ensureAudioContext();
		const audio = await this.#assetsManager.getAudio(payload.name);

		const source = ctx.createBufferSource();
		const gain = ctx.createGain();

		source.buffer = audio;
		source.loop = payload.loop ?? false;

		source.connect(gain);
		gain.connect(ctx.destination);

		gain.gain.value = payload.volume ?? 0;

		source.start(0);
	}

	pauseAll() {
		const ctx = this.#assetsManager.getCurrentAudioContext();
		if (ctx && ctx.state === "running") {
			ctx.suspend();
		}
	}

	destroy() {
		const ctx = this.#assetsManager.getCurrentAudioContext();
		if (ctx && ctx.state === "running") {
			ctx.suspend();
		}
	}

	resumeAll() {
		const ctx = this.#assetsManager.getCurrentAudioContext();
		if (ctx?.state === "suspended") {
			ctx.resume();
		}
	}
}
