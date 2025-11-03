import type { ClientRequest } from "hono/client";
import type { AnyClient, QueryKeyBuilder } from "./types";

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
					// biome-ignore lint/suspicious/noExplicitAny: we don't care about the request schema here since it's a property always defined
					return requestInputToQueryKey(String(prop), (target as ClientRequest<any>).$url(args).toString(), args);
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

export type { AnyClient, HasHttpMethods, NonHttpMethodKeys, OmitNever, QueryKeyBuilder, UnwrapTarget } from "./types";
