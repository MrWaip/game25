/// <reference types="node" />
import path from "node:path";
import type { Node, Rule } from "vite-plus/lint/plugins";

/** Resolve local imports before checking ownership, including relative imports. */
export const importBoundaries: Rule = {
	meta: {
		type: "problem",
		schema: [],
		messages: {
			ownership:
				"{{from}} cannot import {{to}}. Shared modules do not depend on games or application entry points; games remain independent.",
			palette:
				"Assign palette colors only in ui/theme.ts or games/<game>/theme.ts; consumers use semantic roles.",
		},
	},
	create(context) {
		const filename = context.filename.replaceAll(path.sep, "/");
		const marker = filename.lastIndexOf("/src/");
		if (marker < 0) return {};
		const root = filename.slice(0, marker + 5);
		const from = filename.slice(marker + 5);
		const owner = (file: string) =>
			file.startsWith("games/")
				? file.split("/").slice(0, 2).join("/")
				: "shared";
		const application = (file: string) =>
			/^(launcher(?:\/|$)|export(?:\/|$)|main(?:\.ts)?$)/.test(file);
		function check(node: Node, value: unknown) {
			if (typeof value !== "string") return;
			const resolved = value.startsWith("@/")
				? path.resolve(root, value.slice(2)).replaceAll(path.sep, "/")
				: value.startsWith(".")
					? path
							.resolve(path.dirname(filename), value)
							.replaceAll(path.sep, "/")
					: undefined;
			if (!resolved?.startsWith(root)) return;
			const to = resolved.slice(root.length);
			if (
				to.replace(/\.ts$/, "") === "ui/colors" &&
				!/^(ui\/theme|games\/[^/]+\/theme)\.ts$/.test(from)
			) {
				context.report({ node, messageId: "palette" });
			}
			if (application(from)) return;
			if (
				application(to) ||
				(owner(to) !== "shared" && owner(from) !== owner(to))
			) {
				context.report({ node, messageId: "ownership", data: { from, to } });
			}
		}
		return {
			"TSImportType Literal"(node: Node) {
				if ("value" in node) check(node, node.value);
			},
			ImportDeclaration(node) {
				check(node, node.source.value);
			},
			ExportNamedDeclaration(node) {
				if (node.source) check(node, node.source.value);
			},
			ExportAllDeclaration(node) {
				check(node, node.source.value);
			},
			ImportExpression(node) {
				if (node.source.type === "Literal") check(node, node.source.value);
			},
		};
	},
};

export default {
	meta: { name: "architecture" },
	rules: { "import-boundaries": importBoundaries },
};
