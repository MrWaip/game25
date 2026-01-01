import type { Vec2 } from "../primitives/vec2-gl";
import { Component } from "./component";

export type PrimitiveForm = "rect";

export class PrimitiveRenderComponent extends Component {
	#color: string;
	#form: PrimitiveForm;
	#size: Vec2;
	#offset: Vec2;
	#filled: boolean;

	constructor(
		color: string,
		form: PrimitiveForm,
		size: Vec2,
		offset: Vec2,
		filled: boolean,
	) {
		super();

		this.#color = color;
		this.#form = form;
		this.#size = size;
		this.#offset = offset;
		this.#filled = filled;
	}

	get form(): PrimitiveForm {
		return this.#form;
	}

	get filled(): boolean {
		return this.#filled;
	}

	get color(): string {
		return this.#color;
	}

	get size(): Vec2 {
		return this.#size;
	}

	get offset(): Vec2 {
		return this.#offset;
	}
}
