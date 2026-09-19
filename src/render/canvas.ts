/** DOM handle for mounting, styling and input. Only CanvasSurface may resize or acquire a context. */
export type CanvasElement = Omit<
	HTMLCanvasElement,
	"getContext" | "width" | "height"
> &
	Readonly<Pick<HTMLCanvasElement, "width" | "height">>;

export function createCanvas(): CanvasElement {
	return document.createElement("canvas");
}
