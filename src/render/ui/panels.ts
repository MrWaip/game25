import { CanvasUiHost } from "@/render/ui/host";
import type { UiAppearance, UiNode } from "@/render/ui/types";

/** A view can update its panel, but the screen owns its lifetime and clock. */
export type UiPanel = {
	update(content: UiNode | null, options?: { enabled?: boolean }): void;
	set enabled(value: boolean);
};
type Panel = {
	host: CanvasUiHost;
	content: UiNode | null;
	enabled: boolean;
};

/** All panels in a screen share pause, time and teardown; no private RAF. */
export class CanvasUiPanels {
	#panels: Panel[] = [];
	#enabled = true;
	#destroyed = false;
	constructor(private readonly appearance: UiAppearance) {}
	mount(
		root: HTMLElement,
		{
			animate = false,
			touchAction,
		}: { animate?: boolean; touchAction?: "none" | "pan-y" } = {},
	): UiPanel {
		if (this.#destroyed) throw new Error("UI panels are destroyed");
		const host = new CanvasUiHost(root, this.appearance);
		if (touchAction) host.canvas.style.touchAction = touchAction;
		const panel: Panel = { host, content: null, enabled: true };
		root.hidden = true;
		host.enabled = false;
		this.#panels.push(panel);
		const sync = () => {
			if (this.#destroyed) return;
			host.enabled = this.#enabled && panel.enabled && panel.content !== null;
		};
		return {
			update: (content, options = {}) => {
				if (this.#destroyed) return;
				panel.enabled = options.enabled ?? panel.enabled;
				panel.content = content;
				root.hidden = content === null;
				sync();
				host.show(
					content ?? { kind: "panel", children: [] },
					content !== null && animate,
				);
			},
			set enabled(value: boolean) {
				panel.enabled = value;
				sync();
			},
		};
	}
	set enabled(value: boolean) {
		if (this.#destroyed) return;
		this.#enabled = value;
		for (const panel of this.#panels)
			panel.host.enabled = value && panel.enabled && panel.content !== null;
	}
	advance(dt: number): void {
		if (this.#destroyed || !this.#enabled) return;
		for (const panel of this.#panels)
			if (panel.content !== null) panel.host.advance(dt);
	}
	destroy(): void {
		if (this.#destroyed) return;
		this.#destroyed = true;
		const errors: unknown[] = [];
		for (const panel of this.#panels.splice(0).reverse()) {
			try {
				panel.host.destroy();
			} catch (error) {
				errors.push(error);
			}
		}
		if (errors.length)
			throw new AggregateError(errors, "UI panel teardown failed");
	}
}
