import type { Hono } from "hono";
import type { ClientRequest, hc, InferRequestType } from "hono/client";

export type AnyClient = ReturnType<typeof hc<Hono>>;

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type UnwrapTarget = "json" | "text" | "blob" | "formData" | "arrayBuffer";

type QueryBuilderFN<ClientFN, Args = InferRequestType<ClientFN>> = keyof Args extends never ? () => string[] : (args: Args) => string[];

export type QueryKeyBuilder<Client extends AnyClient> = {
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
