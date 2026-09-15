export function element<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className: string,
	text?: string,
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}
export function action(
	label: string,
	onClick: () => void,
	className = "",
	disabled = false,
): HTMLButtonElement {
	const node = element("button", className, label);
	node.type = "button";
	node.disabled = disabled;
	node.onclick = onClick;
	return node;
}
