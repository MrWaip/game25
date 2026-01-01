import "./style.css";
import "./reset.css";

import { createGame } from "./export";

const mainContainer = document.getElementById(
	"game-container",
) as HTMLDivElement;
const url = new URL(window.location.href);

function createDefaultInputStrategy() {
	const isCoarsePointer =
		window.matchMedia?.("(pointer: coarse)").matches ?? false;

	const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

	const screenSize = {
		width: window.innerWidth,
		height: window.innerHeight,
	};

	const baseOrthographicSize = screenSize.height / 2;
	const isMobile = isCoarsePointer || hasTouch;
	const mobileScale = isMobile ? 1.5 : 1;
	const orthographicSize = baseOrthographicSize * mobileScale;

	if (isMobile) {
		return {
			inputMode: "touch" as const,
			pixelSize: window.devicePixelRatio,
			screenSize,
			orthographicSize,
		};
	}

	return {
		inputMode: "keyboard" as const,
		pixelSize: window.devicePixelRatio,
		screenSize,
		orthographicSize,
	};
}

const device = createDefaultInputStrategy();

if (url.searchParams.get("key") === "1c4482c9-ad71-48e1-b649-a8835ea69999") {
	await createGame({
		node: mainContainer,
		targetFps: 144,
		inputMode: device.inputMode,
		debug: url.searchParams.has("debug"),
		seed: url.searchParams.get("seed") || undefined,
		screenSize: device.screenSize,
		orthographicSize: device.orthographicSize,
		pixelRatio: device.pixelSize,
	});
}
