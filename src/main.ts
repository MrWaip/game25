import "@/style.css";
import "@/reset.css";
import { mountArcade } from "@/launcher";

const node = document.getElementById("game-container")!;
const url = new URL(window.location.href);
await mountArcade(node, {
	game: url.searchParams.get("game") === "jumper" ? "jumper" : "defense",
	seed: url.searchParams.get("seed") ?? undefined,
});
