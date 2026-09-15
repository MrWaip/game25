import type { TextStyle } from "@/render/ui/types";

export function font(style: TextStyle): string {
	return `${style.weight ?? 400} ${style.size ?? 14}px ${style.family ?? "system-ui, sans-serif"}`;
}
export function lineHeight(style: TextStyle): number {
	return style.lineHeight ?? (style.size ?? 14) * 1.4;
}

// Uses the actual canvas font metrics, preserves paragraphs and breaks long words.
export class TextLayout {
	#cache = new Map<string, string[]>();
	constructor(
		private readonly measure: (text: string, font: string) => number,
	) {}
	wrap(text: string, style: TextStyle, width: number): string[] {
		const key = JSON.stringify([text, font(style), width, style.maxLines]);
		const cached = this.#cache.get(key);
		if (cached) return cached;
		const lines: string[] = [];
		const fits = (s: string) =>
			this.measure(s, font(style)) <= Math.max(1, width);
		for (const paragraph of text.split("\n")) {
			let line = "";
			for (const word of paragraph.split(/\s+/).filter(Boolean)) {
				const candidate = line ? `${line} ${word}` : word;
				if (fits(candidate)) {
					line = candidate;
					continue;
				}
				if (line) {
					lines.push(line);
					line = "";
				}
				for (const character of Array.from(word)) {
					if (line && !fits(line + character)) {
						lines.push(line);
						line = "";
					}
					line += character;
				}
			}
			lines.push(line);
		}
		if (
			style.maxLines !== undefined &&
			lines.length > Math.max(1, style.maxLines)
		) {
			lines.length = Math.max(1, style.maxLines);
			let last = Array.from(lines[lines.length - 1]);
			while (last.length && !fits(last.join("") + "…"))
				last = last.slice(0, -1);
			lines[lines.length - 1] = last.join("") + "…";
		}
		if (this.#cache.size >= 512) this.#cache.clear();
		this.#cache.set(key, lines);
		return lines;
	}
	clear(): void {
		this.#cache.clear();
	}
}
