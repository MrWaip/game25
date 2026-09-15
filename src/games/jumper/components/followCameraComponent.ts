import { Component } from "@/components/component";

export class FollowCameraComponent extends Component {
	public followX: boolean;
	public followY: boolean;

	constructor(followX: boolean, followY: boolean) {
		super();

		this.followX = followX;
		this.followY = followY;
	}
}
