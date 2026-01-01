import type { Vec2 } from "../primitives/vec2-gl";
import { Component } from "./component";

export class VelocityComponent extends Component {
	public value: Vec2;

	constructor(value: Vec2) {
		super();

		this.value = value;
	}
}
