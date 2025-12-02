import { stableDeepObjectStringify } from "@hono-query/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Hono } from "hono";
import { hc } from "hono/client";
import { validator } from "hono/validator";
import { http } from "msw";
import { setupServer } from "msw/node";
import type { PropsWithChildren } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHonoReactQueryProxy } from "../src";

const stubHonoRouter = new Hono()
	.get("/", (c) => c.json({ message: "hello", foo: "bar" }))
	.get(
		"/request-params",
		validator("query", (value) => value as { param: string }),
		(c) => c.json({ param: c.req.valid("query").param, header: c.req.header("x-custom-header") })
	)
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

const restHandlers = [
	http.all("https://example.com/*", ({ request }) => {
		return stubHonoRouter.fetch(request);
	})
];

const client = hc<typeof stubHonoRouter>("https://example.com");

const mockServer = setupServer(...restHandlers);

const WrapperComponent: React.FC<PropsWithChildren> = ({ children }) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				experimental_prefetchInRender: true
			}
		}
	});

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("Proxy", () => {
	beforeEach(() => vi.useFakeTimers());

	beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));

	afterAll(() => mockServer.close());

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		mockServer.resetHandlers();
		cleanup();
	});

	describe("Transform to hook", () => {
		it("should setup a query proxy for a client", () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			expect(apiQueryClient).toBeDefined();
		});

		it("should proxy a $get method to a useQuery hook", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { data } = apiQueryClient.index.$get({ unwrapTo: "json" }).useQuery();
				return <div>{data?.message}</div>;
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("hello")).toBeDefined();
		});

		it("should proxy a $get method to a useQuery hook with request params", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { data } = apiQueryClient[":id"].$get({ params: { param: { id: "hello" } }, unwrapTo: "json" }).useQuery();
				return <div>id: {data?.id}</div>;
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("id: hello")).toBeDefined();
		});

		it("should proxy a $get method to a useQuery with custom useQuery options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { data } = apiQueryClient.index
					.$get({
						unwrapTo: "json",
						useQueryOptions: {
							select(data) {
								return { ...data, message: "modified" };
							}
						}
					})
					.useQuery();
				return <div>{data?.message}</div>;
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("modified")).toBeDefined();
		});

		it("should proxy a $put method to a useMutation hook", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { mutate, data } = apiQueryClient.index.$put({ unwrapTo: "json" }).useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({})} />
						<span>{data?.message}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("hello")).toBeDefined();
		});

		it("should proxy a $put method to a useMutation hook with request params", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { mutate, data } = apiQueryClient.params[":id"].$put({ unwrapTo: "json" }).useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({ param: { id: "1" }, json: { param: "body param" } })} />
						<span>id: {data?.id}</span>
						<span>param: {data?.param}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("id: 1")).toBeDefined();
			expect(screen.getByText("param: body param")).toBeDefined();
		});

		it("should proxy a $put method to a useMutation with custom useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const successCallback = vi.fn();

			const Component = () => {
				const { mutate, data } = apiQueryClient.index
					.$put({
						unwrapTo: "json",
						useMutationOptions: {
							onSuccess: successCallback
						}
					})
					.useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({})} />
						<span>{data?.message}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(successCallback).toHaveBeenCalledOnce();
		});

		it("should proxy a $post method to a useMutation hook", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { mutate, data } = apiQueryClient.index.$post({ unwrapTo: "json" }).useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({})} />
						<span>{data?.message}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("hello")).toBeDefined();
		});

		it("should proxy a $post method to a useMutation hook with request params", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { mutate, data } = apiQueryClient.params[":id"].$post({ unwrapTo: "json" }).useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({ param: { id: "1" }, json: { param: "body param" } })} />
						<span>id: {data?.id}</span>
						<span>param: {data?.param}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("id: 1")).toBeDefined();
			expect(screen.getByText("param: body param")).toBeDefined();
		});

		it("should proxy a $post method to a useMutation with custom useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const successCallback = vi.fn();

			const Component = () => {
				const { mutate, data } = apiQueryClient.index
					.$post({
						unwrapTo: "json",
						useMutationOptions: {
							onSuccess: successCallback
						}
					})
					.useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({})} />
						<span>{data?.message}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(successCallback).toHaveBeenCalledOnce();
		});

		it("should proxy a $patch method to a useMutation hook", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { mutate, data } = apiQueryClient.index.$patch({ unwrapTo: "json" }).useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({})} />
						<span>{data?.message}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("hello")).toBeDefined();
		});

		it("should proxy a $patch method to a useMutation hook with request params", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { mutate, data } = apiQueryClient.params[":id"].$patch({ unwrapTo: "json" }).useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({ param: { id: "1" }, json: { param: "body param" } })} />
						<span>id: {data?.id}</span>
						<span>param: {data?.param}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("id: 1")).toBeDefined();
			expect(screen.getByText("param: body param")).toBeDefined();
		});

		it("should proxy a $patch method to a useMutation with custom useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const successCallback = vi.fn();

			const Component = () => {
				const { mutate, data } = apiQueryClient.index
					.$patch({
						unwrapTo: "json",
						useMutationOptions: {
							onSuccess: successCallback
						}
					})
					.useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({})} />
						<span>{data?.message}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(successCallback).toHaveBeenCalledOnce();
		});

		it("should proxy a $delete method to a useMutation hook", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { mutate, data } = apiQueryClient.index.$delete({ unwrapTo: "json" }).useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({})} />
						<span>{data?.message}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("hello")).toBeDefined();
		});

		it("should proxy a $delete method to a useMutation with custom useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const successCallback = vi.fn();

			const Component = () => {
				const { mutate, data } = apiQueryClient.index
					.$delete({
						unwrapTo: "json",
						useMutationOptions: {
							onSuccess: successCallback
						}
					})
					.useMutation();

				return (
					<div>
						<button data-testid="button" type="button" onClick={() => mutate({})} />
						<span>{data?.message}</span>
					</div>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			fireEvent.click(screen.getByTestId("button"));
			await vi.advanceTimersByTimeAsync(1000);

			expect(successCallback).toHaveBeenCalledOnce();
		});

		it("should proxy a $get method to a useQuery hook with request params", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const Component = () => {
				const { data } = apiQueryClient["request-params"].$get({ unwrapTo: "json", params: { query: { param: "param" } }, requestParams: { headers: { "x-custom-header": "header" } } }).useQuery();
				return (
					<>
						<div>param: {data?.param}</div>
						<div>header: {data?.header}</div>
					</>
				);
			};

			render(<WrapperComponent>{<Component />}</WrapperComponent>);

			await vi.advanceTimersByTimeAsync(1000);

			expect(screen.getByText("param: param")).toBeDefined();
			expect(screen.getByText("header: header")).toBeDefined();
		});
	});

	describe("Transform to query/mutation options", () => {
		it("should convert a $get method to useQuery options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const queryOptions = apiQueryClient.index.$get({ unwrapTo: "json" }).queryOptions;

			expect(queryOptions).to.have.property("queryKey").to.deep.equal(["$get", client.index.$url().toString()]);
			expect(queryOptions).to.have.property("queryFn").to.be.a("function");
		});

		it("should convert a $get method with params to useQuery options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const queryOptions = apiQueryClient[":id"].$get({ params: { param: { id: "hello" } }, unwrapTo: "json" }).queryOptions;

			expect(queryOptions)
				.to.have.property("queryKey")
				.to.deep.equal(["$get", client[":id"].$url({ param: { id: "hello" } }).toString(), stableDeepObjectStringify({ param: { id: "hello" } })]);

			expect(queryOptions).to.have.property("queryFn").to.be.a("function");
		});

		it("should convert a $get method with addition query options to useQuery options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const queryOptions = apiQueryClient.index.$get({ unwrapTo: "json", useQueryOptions: { refetchInterval: 1000 } }).queryOptions;

			expect(queryOptions).to.have.property("queryKey").to.deep.equal(["$get", client.index.$url().toString()]);
			expect(queryOptions).to.have.property("queryFn").to.be.a("function");
			expect(queryOptions).to.have.property("refetchInterval", 1000);
		});

		it("should proxy a $put method to a useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.index.$put({ unwrapTo: "json" }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$put", client.index.$url().toString()]);
			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
		});

		it("should convert a $put method with params to useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.params[":id"].$put({ unwrapTo: "json" }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$put", client.params[":id"].$url().toString()]);

			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
		});

		it("should convert a $put method with addition mutation options to useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.index.$put({ unwrapTo: "json", useMutationOptions: { retryDelay: 1000 } }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$put", client.index.$url().toString()]);
			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
			expect(mutationOptions).to.have.property("retryDelay", 1000);
		});

		it("should proxy a $post method to a useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.index.$post({ unwrapTo: "json" }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$post", client.index.$url().toString()]);
			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
		});

		it("should convert a $post method with params to useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.params[":id"].$post({ unwrapTo: "json" }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$post", client.params[":id"].$url().toString()]);

			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
		});

		it("should convert a $post method with addition mutation options to useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.index.$post({ unwrapTo: "json", useMutationOptions: { retryDelay: 1000 } }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$post", client.index.$url().toString()]);
			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
			expect(mutationOptions).to.have.property("retryDelay", 1000);
		});

		it("should proxy a $patch method to a useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.index.$patch({ unwrapTo: "json" }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$patch", client.index.$url().toString()]);
			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
		});

		it("should convert a $patch method with params to useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.params[":id"].$patch({ unwrapTo: "json" }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$patch", client.params[":id"].$url().toString()]);

			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
		});

		it("should convert a $delete method to useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.index.$delete({ unwrapTo: "json" }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$delete", client.index.$url().toString()]);
			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
		});

		it("should convert a $delete method with addition mutation options to useMutation options", async () => {
			const apiQueryClient = createHonoReactQueryProxy(client);

			const mutationOptions = apiQueryClient.index.$delete({ unwrapTo: "json", useMutationOptions: { retryDelay: 1000 } }).mutationOptions;

			expect(mutationOptions).to.have.property("mutationKey").to.deep.equal(["$delete", client.index.$url().toString()]);
			expect(mutationOptions).to.have.property("mutationFn").to.be.a("function");
			expect(mutationOptions).to.have.property("retryDelay", 1000);
		});
	});
});
