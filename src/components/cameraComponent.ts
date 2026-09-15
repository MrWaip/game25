import { Component } from "@/components/component";
export class Camera extends Component {
	public zoom: number;
	constructor(options: { zoom?: number } = {}) {
		super();
		this.zoom = options.zoom ?? 1;
	}
}
