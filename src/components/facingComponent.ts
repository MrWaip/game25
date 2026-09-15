import { Component } from "@/components/component";

type Direction = "left" | "right";

export class FacingComponent extends Component {
	public direction: Direction;

	constructor(direction: Direction) {
		super();

		this.direction = direction;
	}
}
