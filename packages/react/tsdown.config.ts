import { defineConfig } from "tsdown/config";

export default defineConfig({
	entry: "src/index.ts",
	minify: false,
	dts: {
		resolve: ["@hono-query/shared"]
	},
	external: ["@tanstack/react-query", "hono"]
});
