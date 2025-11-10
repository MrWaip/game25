import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/export/index.ts"],
  target: false,
  format: "esm",
  outExtensions: () => ({
    js: ".js",
    dts: ".d.ts",
  }),
  banner: "/* eslint-disable */\n// @ts-ignore",
  noExternal: ["gl-matrix", "@timohausmann/quadtree-ts"],
  loader: {
    ".png": "dataurl",
    ".wav": "dataurl",
    ".mp3": "dataurl",
  },
});
