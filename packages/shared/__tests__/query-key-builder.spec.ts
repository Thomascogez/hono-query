import { Hono } from "hono";
import { hc } from "hono/client";
import { validator } from "hono/validator";
import { describe, expect, it } from "vitest";
import { createQueryKeyBuilder, stableDeepObjectStringify } from "../src";

describe("Query key builder", () => {
	const stubHonoRouter = new Hono()
		.get("/", (c) => c.json({ message: "hello", foo: "bar" }))
		.get("/:id", (c) => c.json({ id: c.req.param("id"), message: "hello" }))
		.put("/", (c) => c.json({ message: "hello" }))
		.put(
			"/params/:id",
			validator("json", (value) => value as { param: string }),
			(c) => c.json({ id: c.req.param("id"), param: c.req.valid("json").param, message: "hello" })
		)
		.post("/", (c) => c.json({ message: "hello" }))
		.post(
			"/params/:id",
			validator("json", (value) => value as { param: string }),
			(c) => c.json({ id: c.req.param("id"), param: c.req.valid("json").param, message: "hello" })
		)
		.patch("/", (c) => c.json({ message: "hello" }))
		.patch(
			"/params/:id",
			validator("json", (value) => value as { param: string }),
			(c) => c.json({ id: c.req.param("id"), param: c.req.valid("json").param, message: "hello" })
		)
		.delete("/", (c) => c.json({ message: "hello" }));

	const client = hc<typeof stubHonoRouter>("https://example.com");

	it("should create a query key builder", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		expect(queryKeyBuilder).toBeDefined();
	});

	it("should build a query key for a $get method", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		expect(queryKeyBuilder.index.$get()).toEqual(["$get", "https://example.com/"]);
	});

	it("should build a query key for a $get method with params", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		const params = { param: { id: "hello" } };

		expect(queryKeyBuilder[":id"].$get(params)).toEqual(["$get", "https://example.com/hello", stableDeepObjectStringify(params)]);
	});

	it("should build a query key for a $put method", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		expect(queryKeyBuilder.index.$put()).toEqual(["$put", "https://example.com/"]);
	});

	it("should build a query key for a $put method with params", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		const params = { param: { id: "hello" }, json: { param: "body param" } };

		expect(queryKeyBuilder.params[":id"].$put(params)).toEqual(["$put", "https://example.com/params/hello", stableDeepObjectStringify(params)]);
	});

	it("should build a query key for a $post method", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		expect(queryKeyBuilder.index.$post()).toEqual(["$post", "https://example.com/"]);
	});

	it("should build a query key for a $post method with params", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		const params = { param: { id: "hello" }, json: { param: "body param" } };

		expect(queryKeyBuilder.params[":id"].$post(params)).toEqual(["$post", "https://example.com/params/hello", stableDeepObjectStringify(params)]);
	});

	it("should build a query key for a $patch method", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		expect(queryKeyBuilder.index.$patch()).toEqual(["$patch", "https://example.com/"]);
	});

	it("should build a query key for a $patch method with params", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		const params = { param: { id: "hello" }, json: { param: "body param" } };

		expect(queryKeyBuilder.params[":id"].$patch(params)).toEqual(["$patch", "https://example.com/params/hello", stableDeepObjectStringify(params)]);
	});

	it("should build a query key for a $delete method", () => {
		const queryKeyBuilder = createQueryKeyBuilder(client);

		expect(queryKeyBuilder.index.$delete()).toEqual(["$delete", "https://example.com/"]);
	});
});
