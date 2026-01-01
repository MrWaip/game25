import type { Entity } from "../entities/entity";
import { Component } from "./component";

type Options = {
	followFor?: Entity;
	zoom?: number;
	highestY: number;
	allowFollowDown?: boolean;
};

export class Camera extends Component {
	public zoom: number;
	public followFor: Entity | undefined;
	public highestY: number;
	public allowFollowDown: boolean;

	constructor(options: Options) {
		super();

		this.zoom = options.zoom ?? 1;
		this.followFor = options.followFor;
		this.highestY = options.highestY;
		this.allowFollowDown = options.allowFollowDown ?? false;
	}
}
