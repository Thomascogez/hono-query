import type { InferRequestType } from "hono/client";

//@todo: find a better way to do this
export type AnyClient = unknown;

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type UnwrapTarget = "json" | "text" | "blob" | "formData" | "arrayBuffer";

type QueryBuilderFN<ClientFN, Args = InferRequestType<ClientFN>> = keyof Args extends never ? () => string[] : (args: Args) => string[];

// biome-ignore lint/suspicious/noExplicitAny: We only care about the keys
export type HasHttpMethods = { $get?: any } | { $post?: any } | { $put?: any } | { $patch?: any } | { $delete?: any };

export type NonHttpMethodKeys<T> = {
	[K in keyof T]: K extends `$${string}` ? never : K;
}[keyof T];

export type QueryKeyBuilder<Client extends AnyClient> = {
	[K in keyof Client]: Client[K] extends HasHttpMethods
		? OmitNever<{
				$get: "$get" extends keyof Client[K] ? QueryBuilderFN<Client[K]["$get"]> : never;
				$put: "$put" extends keyof Client[K] ? QueryBuilderFN<Client[K]["$put"]> : never;
				$post: "$post" extends keyof Client[K] ? QueryBuilderFN<Client[K]["$post"]> : never;
				$patch: "$patch" extends keyof Client[K] ? QueryBuilderFN<Client[K]["$patch"]> : never;
				$delete: "$delete" extends keyof Client[K] ? QueryBuilderFN<Client[K]["$delete"]> : never;
			}> &
				QueryKeyBuilder<Pick<Client[K], NonHttpMethodKeys<Client[K]>>> // Only recurse non-HTTP method keys
		: Client[K] extends Record<string, unknown>
			? QueryKeyBuilder<Client[K]>
			: never;
};
