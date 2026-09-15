import {
	contains,
	type ButtonNode,
	type LayoutNode,
	type UiNode,
	type UiAppearance,
} from "@/render/ui/types";
import { TextLayout } from "@/render/ui/text";
import { layout } from "@/render/ui/layout";
import { paint } from "@/render/ui/paint";
import { Tween } from "@/render/ui/motion";

export class CanvasUi {
	#tree: LayoutNode | null = null;
	#text: TextLayout;
	#focus: string | null = null;
	#hover: string | null = null;
	#pressed: string | null = null;
	#held = 0;
	#tooltip: string | null = null;
	#fade: Tween;
	#enabled = true;
	constructor(
		private readonly ctx: CanvasRenderingContext2D,
		private readonly appearance: UiAppearance,
		private readonly reducedMotion = false,
	) {
		this.#text = new TextLayout((text, font) => {
			ctx.save();
			ctx.font = font;
			const width = ctx.measureText(text).width;
			ctx.restore();
			return width;
		});
		this.#fade = new Tween(1, 1, 0);
	}
	show(node: UiNode, width: number, animate = true): void {
		this.#tree = layout(node, 0, 0, width, this.#text);
		const ids = new Set<string>();
		for (const { node: button } of this.buttons) {
			if (ids.has(button.id)) throw new Error(`Duplicate UI id: ${button.id}`);
			ids.add(button.id);
		}
		this.cancel();
		if (!ids.has(this.#focus ?? "")) this.#focus = null;
		this.#fade = new Tween(animate && !this.reducedMotion ? 0 : 1, 1, 0.2);
	}
	get height(): number {
		return this.#tree?.rect.height ?? 0;
	}
	get buttons(): { node: ButtonNode; rect: LayoutNode["rect"] }[] {
		const result: { node: ButtonNode; rect: LayoutNode["rect"] }[] = [];
		const visit = (item: LayoutNode, clip: LayoutNode["rect"]) => {
			const x = Math.max(clip.x, item.rect.x),
				y = Math.max(clip.y, item.rect.y);
			const right = Math.min(
				clip.x + clip.width,
				item.rect.x + item.rect.width,
			);
			const bottom = Math.min(
				clip.y + clip.height,
				item.rect.y + item.rect.height,
			);
			const rect = {
				x,
				y,
				width: Math.max(0, right - x),
				height: Math.max(0, bottom - y),
			};
			if (!rect.width || !rect.height) return;
			if (item.node.kind === "button") result.push({ node: item.node, rect });
			item.children.forEach((child) => visit(child, rect));
		};
		if (this.#tree) visit(this.#tree, this.#tree.rect);
		return result;
	}
	set enabled(value: boolean) {
		this.#enabled = value;
		if (!value) this.cancel();
	}
	focus(id: string | null): void {
		this.#focus = id;
	}
	activate(id: string): void {
		if (!this.#enabled) return;
		const button = this.buttons.find((item) => item.node.id === id)?.node;
		if (button && !button.disabled) button.onPress();
	}
	#hit(x: number, y: number): string | null {
		const visit = (item: LayoutNode): string | null => {
			if (!contains(item.rect, x, y)) return null;
			for (const child of [...item.children].reverse()) {
				const hit = visit(child);
				if (hit) return hit;
			}
			return item.node.kind === "button" ? item.node.id : null;
		};
		return this.#tree ? visit(this.#tree) : null;
	}
	pointer(type: "down" | "move" | "up", x: number, y: number): void {
		if (!this.#enabled) return;
		const hit = this.#hit(x, y);
		if (this.#hover !== hit) {
			this.#hover = hit;
			this.#held = 0;
			this.#tooltip = null;
		}
		if (type === "down") {
			this.#pressed = hit;
			this.#held = 0;
			this.#tooltip = null;
			this.#focus = hit;
		}
		if (type === "move" && this.#pressed !== hit) this.#pressed = null;
		if (type === "up") {
			const activate = hit && hit === this.#pressed && !this.#tooltip;
			this.#pressed = null;
			if (activate) this.activate(hit);
		}
	}
	cancel(): void {
		this.#pressed = null;
		this.#hover = null;
		this.#tooltip = null;
		this.#held = 0;
	}
	advance(dt: number): void {
		this.#fade.advance(dt);
		if (this.#enabled && this.#hover) {
			this.#held += Math.max(0, dt);
			if (
				this.#held >= 0.6 &&
				this.buttons.some(
					(item) => item.node.id === this.#hover && item.node.tooltip,
				)
			)
				this.#tooltip = this.#hover;
		}
	}
	invalidateText(): void {
		this.#text.clear();
	}
	draw(): void {
		if (!this.#tree) return;
		this.ctx.save();
		this.ctx.globalAlpha *= this.#fade.value * (this.#enabled ? 1 : 0.42);
		paint(this.ctx, this.#tree, this.appearance, this.#focus, this.#pressed);
		const target = this.buttons.find((item) => item.node.id === this.#tooltip);
		if (target?.node.tooltip) {
			const width = Math.min(280, this.#tree.rect.width - 16);
			const tip = layout(
				{
					kind: "panel",
					style: {
						padding: 10,
						radius: 8,
						background: this.appearance.tooltipBackground,
					},
					children: [
						{
							kind: "text",
							text: target.node.tooltip,
							style: { color: this.appearance.tooltipText, size: 12 },
						},
					],
				},
				0,
				0,
				width,
				this.#text,
			);
			const x = Math.max(
				8,
				Math.min(target.rect.x, this.#tree.rect.width - width - 8),
			);
			const y = Math.max(
				0,
				Math.min(
					target.rect.y + target.rect.height + 6,
					this.height - tip.rect.height,
				),
			);
			this.ctx.translate(x, y);
			paint(this.ctx, tip, this.appearance, null, null);
		}
		this.ctx.restore();
	}
}
