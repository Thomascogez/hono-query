import { type AnyClient, type OmitNever, requestInputToQueryKey, type UnwrapTarget } from "@hono-query/shared";
import { type UseMutationOptions, type UseMutationResult, type UseQueryOptions, type UseQueryResult, useMutation, useQuery } from "@tanstack/react-query";
import type { ClientRequest, InferRequestType, InferResponseType } from "hono/client";

type QueryRequestOption<Input = Record<string, unknown>, Output = unknown> = {
	unwrapTo: UnwrapTarget;
	// biome-ignore lint/complexity/noBannedTypes: We are explicitly looking for empty object here
	params: Input extends {} ? never : Input;
	useQueryOptions?: Omit<UseQueryOptions<Output, unknown, Output>, "queryKey"> & { queryKey?: UseQueryOptions["queryKey"] };
};

type MutationRequestOption<Input = Record<string, unknown>, Output = unknown> = {
	unwrapTo: UnwrapTarget;
	useMutationOptions?: Omit<UseMutationOptions<Output, unknown, Input>, "mutationKey"> & { mutationKey?: UseMutationOptions["mutationKey"] };
};

type HookifiedHonoClient<Client extends AnyClient> = {
	[K in keyof Client]: Client[K] extends ClientRequest<infer RequestSchema>
		? OmitNever<{
				$get: "$get" extends keyof RequestSchema
					? <Input = InferRequestType<Client[K]["$get"]>, Output = InferResponseType<Client[K]["$get"]>>(options: OmitNever<QueryRequestOption<Input, Output>>) => UseQueryResult<Output, unknown>
					: never;
				$put: "$put" extends keyof RequestSchema
					? <Input = InferRequestType<Client[K]["$put"]>, Output = InferResponseType<Client[K]["$put"]>>(options: MutationRequestOption<Input, Output>) => UseMutationResult<Output, unknown, Input>
					: never;
				$post: "$post" extends keyof RequestSchema
					? <Input = InferRequestType<Client[K]["$post"]>, Output = InferResponseType<Client[K]["$post"]>>(options: MutationRequestOption<Input, Output>) => UseMutationResult<Output, unknown, Input>
					: never;
				$patch: "$patch" extends keyof RequestSchema
					? <Input = InferRequestType<Client[K]["$patch"]>, Output = InferResponseType<Client[K]["$patch"]>>(options: MutationRequestOption<Input, Output>) => UseMutationResult<Output, unknown, Input>
					: never;
				$delete: "$delete" extends keyof RequestSchema
					? <Input = InferRequestType<Client[K]["$delete"]>, Output = InferResponseType<Client[K]["$delete"]>>(
							options: MutationRequestOption<Input, Output>
						) => UseMutationResult<Output, unknown, Input>
					: never;
			}>
		: Client[K] extends Record<string, unknown>
			? HookifiedHonoClient<Client[K]>
			: never;
};

type CreateHonoReactQueryProxyOptions = {
	throwOnHttpError?: boolean;
	httpErrorFactory: (response: Response) => Error;
};

export const createHonoReactQueryProxy = <Client extends AnyClient>(client: Client, honoReactQueryOptions?: CreateHonoReactQueryProxyOptions): HookifiedHonoClient<Client> => {
	const honoReactQueryOptionsWithDefaults: CreateHonoReactQueryProxyOptions = {
		throwOnHttpError: true,
		httpErrorFactory: (response: Response) => new Error(response.statusText),
		...honoReactQueryOptions
	};

	const handler: ProxyHandler<HookifiedHonoClient<AnyClient>> = {
		get(target, prop, receiver) {
			if (prop === "then") {
				return undefined; // avoid promise traps
			}

			const original = Reflect.get(target, prop, receiver);

			if (prop === "$get") {
				return (options: QueryRequestOption) => {
					const { params, unwrapTo, useQueryOptions } = options;

					const queryKey = requestInputToQueryKey(String(prop), (target as AnyClient[string]).$url(params).toString(), params);

					return useQuery({
						queryKey,
						queryFn: async () => {
							const callArgs: unknown[] = [];
							if (params) {
								callArgs.push(params);
							}

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

					const mutationKey = requestInputToQueryKey(String(prop), (target as AnyClient[string]).$url().toString());
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
