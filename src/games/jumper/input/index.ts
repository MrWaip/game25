export type MoveInput =
	| "moveLeft"
	| "moveRight"
	| "moveTop"
	| "moveBottom"
	| "jump";

export interface InputStrategy {
	isDown(action: MoveInput): boolean;
	destroy(): void;
}

const KEY_TABLE: Record<string, MoveInput> = {
	ArrowLeft: "moveLeft",
	KeyA: "moveLeft",
	ArrowRight: "moveRight",
	KeyD: "moveRight",
	ArrowUp: "moveTop",
	KeyW: "moveTop",
	ArrowDown: "moveBottom",
	KeyS: "moveBottom",
	Space: "jump",
};

export class KeyboardInputStrategy implements InputStrategy {
	#keys = new Set<MoveInput>();
	#onKeyDown = (e: KeyboardEvent) => {
		const action = KEY_TABLE[e.code];
		if (action) {
			this.#keys.add(action);
		}
	};
	#onKeyUp = (e: KeyboardEvent) => {
		const action = KEY_TABLE[e.code];
		if (action) {
			this.#keys.delete(action);
		}
	};

	constructor(target: Window = window) {
		target.addEventListener("keydown", this.#onKeyDown);
		target.addEventListener("keyup", this.#onKeyUp);
	}

	isDown(action: MoveInput): boolean {
		return this.#keys.has(action);
	}

	destroy(): void {
		window.removeEventListener("keydown", this.#onKeyDown);
		window.removeEventListener("keyup", this.#onKeyUp);
		this.#keys.clear();
	}
}
type PointerKind = "move" | "jump";

interface PointerState {
	kind: PointerKind;
	startX: number;
	startY: number;
	x: number;
	y: number;
}

interface TouchZonesOptions {
	/** Нижняя часть экрана, где реагируем на касания (0–1). */
	activeHeightRatio?: number; // по умолчанию 0.6 => нижние 40%
	/** Ширина центральной зоны по X (0–1). */
	centerWidthRatio?: number; // по умолчанию 0.33 => треть экрана по центру
	/** Дедзона по X для направления в режиме прыжка. */
	deadZone?: number; // по умолчанию 20px
}

export class MultiTouchZonesInputStrategy implements InputStrategy {
	#keys = new Set<MoveInput>();
	#target: HTMLElement;
	#pointers = new Map<number, PointerState>();

	#activeHeightRatio: number;
	#centerWidthRatio: number;
	#deadZone: number;

	constructor(target: HTMLElement, options: TouchZonesOptions = {}) {
		this.#target = target;
		this.#activeHeightRatio = options.activeHeightRatio ?? 0.6;
		this.#centerWidthRatio = options.centerWidthRatio ?? 0.45;
		this.#deadZone = options.deadZone ?? 20;

		const handlePointerDown = (e: PointerEvent) => {
			e.preventDefault();

			const screenW = window.innerWidth;
			const screenH = window.innerHeight;
			const activeTop = screenH * this.#activeHeightRatio;

			// работаем только с нижней частью
			if (e.clientY < activeTop) return;

			const centerZoneWidth = screenW * this.#centerWidthRatio;
			const centerZoneLeft = (screenW - centerZoneWidth) / 2;
			const centerZoneRight = centerZoneLeft + centerZoneWidth;

			let kind: PointerKind;

			if (e.clientX >= centerZoneLeft && e.clientX <= centerZoneRight) {
				// старт в центре -> прыжок
				kind = "jump";
			} else {
				// старт слева/справа -> движение
				kind = "move";
			}

			const state: PointerState = {
				kind,
				startX: e.clientX,
				startY: e.clientY,
				x: e.clientX,
				y: e.clientY,
			};

			this.#pointers.set(e.pointerId, state);
			this.#target.setPointerCapture(e.pointerId);

			this.#rebuildKeys();
		};

		const handlePointerMove = (e: PointerEvent) => {
			const state = this.#pointers.get(e.pointerId);
			if (!state) return;

			e.preventDefault();
			state.x = e.clientX;
			state.y = e.clientY;

			this.#rebuildKeys();
		};

		const handlePointerEnd = (e: PointerEvent) => {
			if (!this.#pointers.has(e.pointerId)) return;

			e.preventDefault();

			try {
				this.#target.releasePointerCapture(e.pointerId);
			} catch {}

			this.#pointers.delete(e.pointerId);
			this.#rebuildKeys();
		};

		this.#handlePointerDown = handlePointerDown;
		this.#handlePointerMove = handlePointerMove;
		this.#handlePointerEnd = handlePointerEnd;

		this.#target.addEventListener("pointerdown", handlePointerDown);
		this.#target.addEventListener("pointermove", handlePointerMove);
		this.#target.addEventListener("pointerup", handlePointerEnd);
		this.#target.addEventListener("pointercancel", handlePointerEnd);
		this.#target.addEventListener("pointerleave", handlePointerEnd);

		window.addEventListener("blur", this.#handleBlur);
		document.addEventListener("visibilitychange", this.#handleVisibilityChange);
	}

	#handlePointerDown: (e: PointerEvent) => void;
	#handlePointerMove: (e: PointerEvent) => void;
	#handlePointerEnd: (e: PointerEvent) => void;

	#handleBlur = () => {
		this.#pointers.clear();
		this.#keys.clear();
	};

	#handleVisibilityChange = () => {
		if (document.visibilityState !== "visible") {
			this.#pointers.clear();
			this.#keys.clear();
		}
	};

	#rebuildKeys() {
		this.#keys.clear();

		if (this.#pointers.size === 0) return;

		const screenW = window.innerWidth;
		const centerZoneWidth = screenW * this.#centerWidthRatio;
		const centerZoneLeft = (screenW - centerZoneWidth) / 2;
		const centerZoneRight = centerZoneLeft + centerZoneWidth;

		// 1) все move-пальцы -> движение по зоне
		for (const state of this.#pointers.values()) {
			if (state.kind !== "move") continue;

			const x = state.x;

			if (x < centerZoneLeft) {
				this.#keys.add("moveLeft");
			} else if (x > centerZoneRight) {
				this.#keys.add("moveRight");
			} else {
				// в центре можно трактовать как "стоим" — ничего не добавляем
			}
		}

		// 2) все jump-пальцы -> jump, плюс направление по dx
		for (const state of this.#pointers.values()) {
			if (state.kind !== "jump") continue;

			this.#keys.add("jump");

			const dx = state.x - state.startX;

			if (dx > this.#deadZone) {
				this.#keys.add("moveRight");
			} else if (dx < -this.#deadZone) {
				this.#keys.add("moveLeft");
			}
		}
	}

	isDown(action: MoveInput): boolean {
		return this.#keys.has(action);
	}

	destroy(): void {
		this.#target.removeEventListener("pointerdown", this.#handlePointerDown);
		this.#target.removeEventListener("pointermove", this.#handlePointerMove);
		this.#target.removeEventListener("pointerup", this.#handlePointerEnd);
		this.#target.removeEventListener("pointercancel", this.#handlePointerEnd);
		this.#target.removeEventListener("pointerleave", this.#handlePointerEnd);

		window.removeEventListener("blur", this.#handleBlur);
		document.removeEventListener(
			"visibilitychange",
			this.#handleVisibilityChange,
		);

		this.#pointers.clear();
		this.#keys.clear();
	}
}
