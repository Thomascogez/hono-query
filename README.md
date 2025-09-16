# Hono Query

> [!WARNING]  
> This is still experimental and in active development.
> The API is subject to change and it the documentation is not yet complete.

## What is this ?

`hono-query` is a library that aims to provide a streamlined way to use [Hono](https://github.com/honojs/hono) rpc client with [React Query](https://tanstack.com/query/v4/docs/react/guides/queries) by creating a proxy that automatically generates the queries and mutations for you.

```ts
import { apiClient } from "@api/client";
import { createHonoReactQueryProxy } from "@hono-query/react";

const apiQueryClient = createHonoReactQueryProxy(apiClient);

export const MyComponent = () => {
    const { data, isLoading } = apiQueryClient.users.$get({ 
        unwrapTo: "json", 
        params: {id: 1}, 
        useMutationOptions: { onSuccess: () => console.log("success") } 
    }); // 👈 Automatically transform to a useQuery hook

    return (
        <div>
            <span>Loading: {isLoading ? "true" : "false"}</span>
            <span>Name: {data?.name}</span>
        </div>
    )
};
```
