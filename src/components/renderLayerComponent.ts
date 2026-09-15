import { Component } from "@/components/component";

export class RenderLayerComponent extends Component {
	#value: number;

	constructor(layer = 0) {
		super();
		this.#value = layer;
	}

	get value(): number {
		return this.#value;
	}

	set value(layer: number) {
		this.#value = layer;
	}
}
