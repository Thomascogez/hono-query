import type { Hono } from "hono";
import type { ClientRequest, hc, InferRequestType } from "hono/client";
import type { BlankSchema } from "hono/types";

export type AnyClient = ReturnType<typeof hc<Hono>>;

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type UnwrapTarget = "json" | "text" | "blob" | "formData" | "arrayBuffer";

type QueryBuilderFN<ClientFN, Args = InferRequestType<ClientFN>> = keyof Args extends never ? () => string[] : (args: Args) => string[];

type QueryKeyBuilder<Client extends AnyClient> = {
	[K in keyof Client]: Client[K] extends ClientRequest<infer RequestSchema>
		? OmitNever<{
				$get: "$get" extends keyof RequestSchema ? QueryBuilderFN<Client[K]["$get"]> : never;
				$put: "$put" extends keyof RequestSchema ? QueryBuilderFN<Client[K]["$put"]> : never;
				$post: "$post" extends keyof RequestSchema ? QueryBuilderFN<Client[K]["$post"]> : never;
				$patch: "$patch" extends keyof RequestSchema ? QueryBuilderFN<Client[K]["$patch"]> : never;
				$delete: "$delete" extends keyof RequestSchema ? QueryBuilderFN<Client[K]["$delete"]> : never;
			}>
		: Client[K] extends Record<string, unknown>
			? QueryKeyBuilder<Client[K]>
			: never;
};

export const stableDeepObjectStringify = (object: Record<string, unknown>) => {
	return JSON.stringify(object, (_, value) => {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return Object.keys(value)
				.sort()
				.reduce<Record<string, unknown>>((result, key) => {
					result[key] = value[key];
					return result;
				}, {});
		}
		return value;
	});
};

export const requestInputToQueryKey = (method: string, url: string, args?: Record<string, unknown>) => {
	const queryKey = [method, url];

	if (args) {
		if (Object.keys(args).length > 0) {
			queryKey.push(stableDeepObjectStringify(args));
		}
	}

	return queryKey;
};

export const createQueryKeyBuilder = <Client extends AnyClient>(client: Client): QueryKeyBuilder<Client> => {
	const handler: ProxyHandler<QueryKeyBuilder<AnyClient>> = {
		get(target, prop, receiver) {
			const original = Reflect.get(target, prop, receiver);

			if (prop === "then") {
				return undefined;
			}

			if (["$get", "$put", "$post", "$patch", "$delete"].includes(String(prop))) {
				return (args: Record<string, unknown>) => {
					return requestInputToQueryKey(String(prop), (target as ClientRequest<BlankSchema>).$url(args).toString(), args);
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
