import type { Vec2 } from "../primitives/vec2-gl";
import { Component } from "./component";

type Axis = "x" | "y";
type Direction = 1 | -1;

type Options = {
	axis: Axis;
	min: number;
	max: number;
	speed: number;
	direction?: Direction;
	origin: Vec2;
};

export class MovingPlatformComponent extends Component {
	public axis: Axis;
	public min: number;
	public max: number;
	public speed: number;
	public direction: Direction;
	public origin: Vec2;

	constructor(options: Options) {
		super();

		this.axis = options.axis;
		this.min = options.min;
		this.max = options.max;
		this.speed = options.speed;
		this.direction = options.direction ?? 1;
		this.origin = options.origin;
	}
}
