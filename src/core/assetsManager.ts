import type { AudioName, SpriteName } from "../assets";

export class AssetsManager<SpriteKey extends string = SpriteName> {
	#images: Map<SpriteName, ImageBitmap>;
	#audios: Map<AudioName, AudioBuffer>;
	#audioData: Map<AudioName, ArrayBuffer>;
	#audioDecodePromises: Map<AudioName, Promise<AudioBuffer>>;
	#sprites: Map<SpriteKey, string>;
	#audioUrls: Map<AudioName, string>;
	#audioCtx: AudioContext | undefined;

	constructor() {
		this.#images = new Map();
		this.#sprites = new Map();
		this.#audioUrls = new Map();
		this.#audios = new Map();
		this.#audioData = new Map();
		this.#audioDecodePromises = new Map();
	}

	getImage(key: SpriteName): ImageBitmap {
		return this.#images.get(key)!;
	}

	addSprites(sprites: Record<SpriteKey, string>) {
		for (const [key, url] of Object.entries(sprites)) {
			this.#sprites.set(key as SpriteKey, url as string);
		}
	}

	addAudio(audio: Record<AudioName, string>) {
		for (const [key, url] of Object.entries(audio)) {
			this.#audioUrls.set(key as AudioName, url as string);
		}
	}

	async getAudio(key: AudioName): Promise<AudioBuffer> {
		const cached = this.#audios.get(key);
		if (cached) return cached;

		const inFlight = this.#audioDecodePromises.get(key);
		if (inFlight) return inFlight;

		const data = this.#audioData.get(key);
		if (!data) {
			throw new Error(`Audio ${key} not loaded`);
		}

		const decodePromise = this.ensureAudioContext().then(async (ctx) => {
			const buffer = await ctx.decodeAudioData(data.slice(0));
			this.#audios.set(key, buffer);
			this.#audioDecodePromises.delete(key);
			return buffer;
		});

		this.#audioDecodePromises.set(key, decodePromise);

		return decodePromise;
	}

	async ensureAudioContext(): Promise<AudioContext> {
		if (!this.#audioCtx) {
			this.#audioCtx = new AudioContext();
		}

		if (this.#audioCtx.state === "suspended") {
			try {
				await this.#audioCtx.resume();
			} catch {}
		}

		return this.#audioCtx;
	}

	getCurrentAudioContext(): AudioContext | undefined {
		return this.#audioCtx;
	}

	async initialize(): Promise<void> {
		await Promise.all([
			...this.#sprites.entries().map(async ([key, url]) => {
				const result = await fetch(url);
				const blob = await result.blob();
				const image = await createImageBitmap(blob);

				this.#images.set(key as SpriteName, image);
			}),
			...this.#audioUrls.entries().map(async ([key, url]) => {
				const result = await fetch(url);
				const blob = await result.arrayBuffer();
				this.#audioData.set(key, blob);
			}),
		]);
	}
}
