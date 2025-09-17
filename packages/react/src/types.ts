import type { AnyClient, OmitNever, UnwrapTarget } from "@hono-query/shared";
import type { UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { ClientRequest, InferRequestType, InferResponseType } from "hono/client";

export type QueryRequestOption<Input = Record<string, unknown>, Output = unknown> = {
	unwrapTo: UnwrapTarget;
	params: keyof Input extends never ? never : Input;
	useQueryOptions?: Omit<UseQueryOptions<Output, unknown, Output>, "queryKey"> & { queryKey?: UseQueryOptions["queryKey"] };
};

export type MutationRequestOption<Input = Record<string, unknown>, Output = unknown> = {
	unwrapTo: UnwrapTarget;
	useMutationOptions?: Omit<UseMutationOptions<Output, unknown, Input>, "mutationKey"> & { mutationKey?: UseMutationOptions["mutationKey"] };
};

export type InferQueryRequestOptions<ClientFN, Input = InferRequestType<ClientFN>, Output = InferResponseType<ClientFN>> = OmitNever<Omit<QueryRequestOption<Input, Output>, "unwrapTo">>;

export type InferMutationRequestOptions<ClientFN, Input = InferRequestType<ClientFN>, Output = InferResponseType<ClientFN>> = OmitNever<Omit<MutationRequestOption<Input, Output>, "unwrapTo">>;

export type ReactQueryHonoClient<Client extends AnyClient> = {
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
			? ReactQueryHonoClient<Client[K]>
			: never;
};

export type CreateHonoReactQueryProxyOptions = {
	throwOnHttpError?: boolean;
	httpErrorFactory: (response: Response) => Error;
};
