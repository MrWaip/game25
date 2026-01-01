import type { AABB } from "../primitives/aabb";
import { Component } from "./component";

type AABBRender = {
	type: "aabb";
	aabb: AABB;
	color: string;
	name?: string;
};

type DebugRender = AABBRender;

export class DebugRenderComponent extends Component {
	#renders: DebugRender[];
	persistentRenders: Map<string, DebugRender> = new Map();

	constructor() {
		super();

		this.#renders = [];
	}

	setPersistentAABB(key: string, aabb: AABB, color = "blue"): void {
		this.persistentRenders.set(key, { aabb, color, type: "aabb", name: key });
	}

	removePersistentAABB(key: string): void {
		this.persistentRenders.delete(key);
	}

	addAABB(aabb: AABB, color = "blue"): void {
		this.#renders.push({
			aabb,
			color,
			type: "aabb",
		});
	}

	*flush(): Generator<DebugRender> {
		for (const render of this.#renders) {
			yield render;
		}

		this.#renders = [];
	}

	*persistent(): Generator<DebugRender> {
		for (const render of this.persistentRenders.values()) {
			yield render;
		}
	}
}
