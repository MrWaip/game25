import "./style.css";
import "./reset.css";

import { createGame } from "./export";

const mainContainer = document.getElementById(
  "game-container"
) as HTMLDivElement;
const url = new URL(window.location.href);

function createDefaultInputStrategy() {
  const isCoarsePointer =
    window.matchMedia?.("(pointer: coarse)").matches ?? false;

  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isCoarsePointer || hasTouch) {
    const scale = 1.5;
    return {
      inputMode: "touch" as const,
      viewportSize: {
        width: window.innerWidth * scale,
        height: window.innerHeight * scale,
      },
    };
  }

  return {
    inputMode: "keyboard" as const,
    viewportSize: {
      width: 1280,
      height: 720,
    },
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
    viewportSize: device.viewportSize,
  });
}
