import type { AssetsManager } from "@/core/assetsManager";

export interface IAudioPlayer {
	play(payload: PlayPayload): Promise<void> | void;
	pauseAll(): void;
	resumeAll(): void;
	destroy(): void;
}

type PlayPayload = {
	name: string;
	loop?: boolean;
	volume?: number;
};

export class AudioPlayer implements IAudioPlayer {
	#assetsManager: AssetsManager;
	#destroyed = false;
	#paused = false;

	constructor(assetsManager: AssetsManager) {
		this.#assetsManager = assetsManager;
	}

	async play(payload: PlayPayload) {
		if (this.#destroyed || this.#paused) return;
		const ctx = await this.#assetsManager.ensureAudioContext();
		const audio = await this.#assetsManager.getAudio(payload.name);

		if (this.#destroyed || this.#paused) return;

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
		this.#paused = true;
		const ctx = this.#assetsManager.getCurrentAudioContext();
		if (ctx && ctx.state === "running") {
			ctx.suspend();
		}
	}

	destroy() {
		this.#destroyed = true;
		const ctx = this.#assetsManager.getCurrentAudioContext();
		if (ctx && ctx.state === "running") {
			ctx.suspend();
		}
	}

	resumeAll() {
		if (this.#destroyed) return;
		this.#paused = false;
		const ctx = this.#assetsManager.getCurrentAudioContext();
		if (ctx?.state === "suspended") {
			ctx.resume();
		}
	}
}
