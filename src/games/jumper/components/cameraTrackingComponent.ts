import { Component } from "@/components/component";
import type { Entity } from "@/entities/entity";
export class CameraTracking extends Component {
	public allowFollowDown = false;
	constructor(
		public highestY: number,
		public followFor?: Entity,
	) {
		super();
	}
}
