import type { DefenseSnapshot } from "@/games/defense/snapshot";

/** Small synthesized accents, unlocked only by a player gesture. Gameplay never
 * depends on audio availability and repeated procs are coalesced per frame. */
export class BattleAudio {
	#context: AudioContext | null = null;
	#lastCount = 0;
	#lastTime = -1;
	#run = "";
	enabled = true;
	unlock(): void {
		if (!this.enabled || typeof AudioContext === "undefined") return;
		this.#context ??= new AudioContext();
		if (this.#context.state === "suspended")
			void this.#context.resume().catch(() => {});
	}
	update(state: DefenseSnapshot): void {
		const count = Object.values(state.triggers).reduce(
			(total, n) => total + (n ?? 0),
			0,
		);
		if (this.#run !== state.runId || state.elapsed < this.#lastTime) {
			this.#run = state.runId;
			this.#lastCount = count;
			this.#lastTime = -1;
		}
		if (
			state.phase !== "wave" ||
			!this.enabled ||
			!this.#context ||
			count <= this.#lastCount ||
			state.elapsed - this.#lastTime < 0.12
		)
			return;
		const strength = Math.min(5, count - this.#lastCount);
		this.#lastCount = count;
		this.#lastTime = state.elapsed;
		const ctx = this.#context,
			now = ctx.currentTime;
		const oscillator = ctx.createOscillator(),
			gain = ctx.createGain();
		oscillator.type = "sine";
		oscillator.frequency.setValueAtTime(220 + strength * 75, now);
		oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.16);
		gain.gain.setValueAtTime(0.025, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
		oscillator.connect(gain);
		gain.connect(ctx.destination);
		oscillator.onended = () => {
			oscillator.disconnect();
			gain.disconnect();
		};
		oscillator.start(now);
		oscillator.stop(now + 0.2);
	}
	destroy(): void {
		if (this.#context) void this.#context.close().catch(() => {});
		this.#context = null;
	}
}
