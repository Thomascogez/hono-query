import type { Hono } from "hono";
import type { ClientRequest, hc, InferRequestType } from "hono/client";

// biome-ignore lint/suspicious/noExplicitAny: Needed for proper generics inference
export type AnyClient = ReturnType<typeof hc<Hono<any, any, string>>>;

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type UnwrapTarget = "json" | "text" | "blob" | "formData" | "arrayBuffer";

type QueryKeyBuilder<Client extends AnyClient> = {
	[K in keyof Client]: Client[K] extends ClientRequest<infer RequestSchema>
		? OmitNever<{
				$get: "$get" extends keyof RequestSchema ? <Args extends InferRequestType<Client[K]["$get"]>>(args: Args) => string[] : never;
				$put: "$put" extends keyof RequestSchema ? <Args extends InferRequestType<Client[K]["$put"]>>(args: Args) => string[] : never;
				$post: "$post" extends keyof RequestSchema ? <Args extends InferRequestType<Client[K]["$post"]>>(args: Args) => string[] : never;
				$patch: "$patch" extends keyof RequestSchema ? <Args extends InferRequestType<Client[K]["$patch"]>>(args: Args) => string[] : never;
				$delete: "$delete" extends keyof RequestSchema ? <Args extends InferRequestType<Client[K]["$delete"]>>(args: Args) => string[] : never;
			}>
		: Client[K] extends Record<string, unknown>
			? QueryKeyBuilder<Client[K]>
			: never;
};

const stableDeepObjectStringify = (object: Record<string, unknown>) => {
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
					return requestInputToQueryKey(String(prop), (target as AnyClient[string]).$url(args).toString(), args);
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
