export class AssetsManager<
	SpriteKey extends string = string,
	AudioKey extends string = string,
> {
	#images: Map<SpriteKey, ImageBitmap>;
	#audios: Map<AudioKey, AudioBuffer>;
	#audioData: Map<AudioKey, ArrayBuffer>;
	#audioDecodePromises: Map<AudioKey, Promise<AudioBuffer>>;
	#sprites: Map<SpriteKey, string>;
	#audioUrls: Map<AudioKey, string>;
	#audioCtx: AudioContext | undefined;

	constructor() {
		this.#images = new Map();
		this.#sprites = new Map();
		this.#audioUrls = new Map();
		this.#audios = new Map();
		this.#audioData = new Map();
		this.#audioDecodePromises = new Map();
	}

	getImage(key: SpriteKey): ImageBitmap {
		return this.#images.get(key)!;
	}

	addSprites(sprites: Record<SpriteKey, string>) {
		for (const [key, url] of Object.entries(sprites)) {
			this.#sprites.set(key as SpriteKey, url as string);
		}
	}

	addAudio(audio: Record<AudioKey, string>) {
		for (const [key, url] of Object.entries(audio)) {
			this.#audioUrls.set(key as AudioKey, url as string);
		}
	}

	async getAudio(key: AudioKey): Promise<AudioBuffer> {
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

	async destroy(): Promise<void> {
		for (const image of this.#images.values()) image.close();
		this.#images.clear();
		this.#audios.clear();
		this.#audioData.clear();
		this.#audioDecodePromises.clear();
		if (this.#audioCtx && this.#audioCtx.state !== "closed")
			await this.#audioCtx.close();
	}

	async initialize(): Promise<void> {
		const results = await Promise.allSettled([
			...this.#sprites.entries().map(async ([key, url]) => {
				const result = await fetch(url);
				const blob = await result.blob();
				const image = await createImageBitmap(blob);

				this.#images.set(key as SpriteKey, image);
			}),
			...this.#audioUrls.entries().map(async ([key, url]) => {
				const result = await fetch(url);
				const blob = await result.arrayBuffer();
				this.#audioData.set(key, blob);
			}),
		]);
		// A failed sibling must not leave late image loads writing after teardown.
		const failures = results
			.filter((result) => result.status === "rejected")
			.map((result) => result.reason);
		if (failures.length === 1) throw failures[0];
		if (failures.length > 1)
			throw new AggregateError(failures, "Asset loading failed");
	}
}
