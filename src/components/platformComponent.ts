import { Component } from "./component";

export type PlatformKind = "default" | "iced" | "moving";

export class PlatformComponent extends Component {
	public kind: PlatformKind;
	public timeToDisappear: number | undefined;
	public timeToRest: number | undefined;

	constructor(kind: PlatformKind) {
		super();

		this.kind = kind;
		this.timeToDisappear = undefined;
		this.timeToRest = undefined;
	}
}
