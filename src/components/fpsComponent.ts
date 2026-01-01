import { Component } from "./component";

export class FPSComponent extends Component {
	public fps: number;
	#fpsHistory: number[] = [];

	constructor() {
		super();
		this.fps = 0;
	}

	update(dt: number): void {
		if (dt > 0) {
			const instantFPS = 1 / dt;
			this.#fpsHistory.push(instantFPS);

			// Храним только последние 60 кадров для усреднения
			if (this.#fpsHistory.length > 60) {
				this.#fpsHistory.shift();
			}

			// Вычисляем среднее значение FPS
			const displayFPS = Math.round(
				this.#fpsHistory.reduce((a, b) => a + b, 0) / this.#fpsHistory.length,
			);

			this.fps = displayFPS;
		}
	}
}
