import type { Rule } from "vite-plus/lint/plugins";

/** Native frame configuration is private even to game-specific painters. */
export const canvasOwnership: Rule = {
	meta: {
		type: "problem",
		schema: [],
		messages: {
			owner:
				"CanvasSurface owns the native context and frame transform. Use PaintContext inside a surface frame.",
		},
	},
	create(context) {
		const file = context.filename.replaceAll("\\", "/");
		if (
			file.endsWith("/render/surface.ts") ||
			file.endsWith("/render/canvas.ts") ||
			file.endsWith(".test.ts") ||
			file.includes("/testkit/")
		)
			return {};
		return {
			CallExpression(node) {
				const first = node.arguments[0];
				if (first?.type !== "Literal" || first.value !== "canvas") return;
				const name =
					node.callee.type === "Identifier"
						? node.callee.name
						: node.callee.type === "MemberExpression" &&
							  node.callee.property.type === "Identifier"
							? node.callee.property.name
							: undefined;
				if (name === "createElement" || name === "element")
					context.report({ node, messageId: "owner" });
			},
			MemberExpression(node) {
				const name =
					!node.computed && node.property.type === "Identifier"
						? node.property.name
						: node.property.type === "Literal"
							? node.property.value
							: undefined;
				if (
					["getContext", "setTransform", "resetTransform"].includes(
						String(name),
					)
				)
					context.report({ node, messageId: "owner" });
			},
			TSTypeReference(node) {
				if (
					node.typeName.type === "Identifier" &&
					["CanvasRenderingContext2D", "HTMLCanvasElement"].includes(
						node.typeName.name,
					)
				)
					context.report({ node, messageId: "owner" });
			},
		};
	},
};
