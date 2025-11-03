import { type AnyClient, requestInputToQueryKey } from "@hono-query/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ClientRequest, ClientRequestOptions } from "hono/client";
import type { CreateHonoReactQueryProxyOptions, MutationRequestOption, QueryRequestOption, ReactQueryHonoClient } from "./types";

export const createHonoReactQueryProxy = <Client extends AnyClient>(client: Client, honoReactQueryOptions?: CreateHonoReactQueryProxyOptions): ReactQueryHonoClient<Client> => {
	const honoReactQueryOptionsWithDefaults: CreateHonoReactQueryProxyOptions = {
		throwOnHttpError: true,
		httpErrorFactory: (response: Response) => new Error(response.statusText),
		...honoReactQueryOptions
	};

	const handler: ProxyHandler<ReactQueryHonoClient<AnyClient>> = {
		get(target, prop, receiver) {
			if (prop === "then") {
				return undefined; // avoid promise traps
			}

			const original = Reflect.get(target, prop, receiver);

			if (prop === "$get") {
				return (options: QueryRequestOption) => {
					const { params, requestParams, unwrapTo, useQueryOptions } = options;

					// biome-ignore lint/suspicious/noExplicitAny: we don't care about the request schema here since it's a property always defined
					const queryKey = requestInputToQueryKey(String(prop), (target as ClientRequest<any>).$url(params).toString(), params);

					return useQuery({
						queryKey,
						queryFn: async ({ signal }) => {
							const callArgs: unknown[] = [];
							if (params) {
								callArgs.push(params);
							}

							callArgs.push({ ...requestParams, init: { signal, ...requestParams?.init } } satisfies ClientRequestOptions);

							const response: Response = await Reflect.apply(original, receiver, callArgs);
							if (!response.ok && honoReactQueryOptionsWithDefaults.throwOnHttpError) {
								throw honoReactQueryOptionsWithDefaults.httpErrorFactory(response);
							}

							return response[unwrapTo]();
						},
						...useQueryOptions
					});
				};
			}

			if (["$put", "$post", "$patch", "$delete"].includes(String(prop))) {
				return (options: MutationRequestOption) => {
					const { unwrapTo, useMutationOptions } = options;

					// biome-ignore lint/suspicious/noExplicitAny: we don't care about the request schema here since it's a property always defined
					const mutationKey = requestInputToQueryKey(String(prop), (target as ClientRequest<any>).$url().toString());
					return useMutation({
						mutationKey,
						mutationFn: async (variables) => {
							const response: Response = await Reflect.apply(original, receiver, [variables]);
							if (!response.ok && honoReactQueryOptionsWithDefaults.throwOnHttpError) {
								throw honoReactQueryOptionsWithDefaults.httpErrorFactory(response);
							}

							return response[unwrapTo]();
						},
						...useMutationOptions
					});
				};
			}

			if ((original && typeof original === "object") || typeof original === "function") {
				return new Proxy(original, handler);
			}

			return original;
		}
	};

	// biome-ignore lint/suspicious/noExplicitAny: Find something better than any here 😅, but proxy are hard to properly type
	return new Proxy(client as any, handler);
};

export { createQueryKeyBuilder } from "@hono-query/shared";

export type { InferMutationRequestOptions, InferQueryRequestOptions } from "./types";
