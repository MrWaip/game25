import { fileURLToPath } from "node:url";

export const aliases = {
	"@": fileURLToPath(new URL("./src", import.meta.url)),
};
