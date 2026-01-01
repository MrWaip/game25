import { Component } from "./component";

export class RocketFlightComponent extends Component {
	readonly startY: number;
	readonly targetY: number;
	readonly startTime: number;

	constructor(startY: number, targetY: number, startTime: number) {
		super();
		this.startY = startY;
		this.targetY = targetY;
		this.startTime = startTime;
	}
}
