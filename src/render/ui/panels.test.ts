import { afterEach, expect, it, vi } from "vite-plus/test";
import { createCanvasContext } from "@/testkit/canvas";
import { CanvasUiPanels, createWidgets } from "@/render/ui";

afterEach(() => {
	vi.restoreAllMocks();
	document.body.replaceChildren();
});

it("owns panel visibility, local availability, pause, stale actions and teardown", () => {
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
		createCanvasContext(),
	);
	vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
	const panels = new CanvasUiPanels({
		focus: "blue",
		tooltipBackground: "black",
		tooltipText: "white",
	});
	const kit = createWidgets({
		text: "white",
		muted: "gray",
		surface: "black",
		border: "gray",
		action: "blue",
		onAction: "white",
	});
	const root = document.createElement("div"),
		other = document.createElement("div");
	document.body.append(root, other);
	try {
		const first = panels.mount(root),
			second = panels.mount(other, { animate: true });
		const press = vi.fn();
		const content = kit.button({ id: "act", label: "Act", onPress: press });
		expect(root.hidden).toBe(true);
		first.update(content);
		second.update(content, { enabled: false });
		expect(root.hidden).toBe(false);
		const button = () => root.querySelector("button")!;
		button().click();
		other.querySelector("button")!.click();
		expect(press).toHaveBeenCalledOnce();
		panels.enabled = false;
		first.update(content);
		button().click();
		expect(button().disabled).toBe(true);
		panels.advance(1);
		panels.enabled = true;
		expect(button().disabled).toBe(false);
		expect(other.querySelector("button")!.disabled).toBe(true);
		const stale = button();
		first.update(null);
		expect(root.hidden).toBe(true);
		stale.click();
		expect(press).toHaveBeenCalledOnce();
		first.update(content);
		button().focus();
		first.update(content);
		expect(document.activeElement).toBe(button());
		const destroyed = button();
		panels.destroy();
		panels.destroy();
		first.update(content);
		first.enabled = true;
		destroyed.click();
		expect(press).toHaveBeenCalledOnce();
		expect(root.childElementCount + other.childElementCount).toBe(0);
		expect(() => panels.mount(root)).toThrow("destroyed");
	} finally {
		panels.destroy();
	}
});
