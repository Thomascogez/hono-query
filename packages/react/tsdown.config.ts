import { defineConfig } from "tsdown/config";

export default defineConfig({
	entry: "src/index.ts",
	dts: true,
	minify: true,
	external: ["@tanstack/react-query", "hono"]
});
