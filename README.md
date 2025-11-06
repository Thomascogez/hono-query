# Hono Query

> ⚠️ **Warning**: This library is experimental and in active development.

Automatic React Query integration for Hono RPC clients using a proxy-based approach.

## Install

```bash
npm install @hono-query/react
```

## Basic Usage

### 1. Setup

```typescript
import { hc } from "hono/client";
import { createHonoReactQueryProxy } from "@hono-query/react";
import type { AppType } from "./server";

// Create your Hono client
const client = hc<AppType>('/api')

// Create the query proxy
export const api = createHonoReactQueryProxy(client)
```

### 2. Use in components

```typescript
export const UserProfile = ({ userId }) => {
  // GET request -> useQuery
  const { data, isLoading } = api.users[':id'].$get({
    unwrapTo: 'json',
    params: { id: userId }
  }).useQuery

  // POST request -> useMutation
  const createUser = api.users.$post({
    unwrapTo: 'json'
  }).useMutation()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={() => createUser.mutate({ json: { name: 'New User' } })}>
        Create User
      </button>
    </div>
  )
}
```

## API Reference

### `createHonoReactQueryProxy(client, options?)`

Creates a proxy that transforms Hono client methods into React Query hooks.

#### Parameters

- `client` - Your Hono RPC client
- `options?` - Configuration object

#### Options

```typescript
{
  throwOnHttpError?: boolean // Default: true
  httpErrorFactory: (response: Response) => Error
}
```

### Query Options (GET requests)

```typescript
{
  unwrapTo: 'json' | 'text' | 'arrayBuffer' | 'blob'
  params: RequestParams // Required if endpoint needs params
  useQueryOptions?: UseQueryOptions // React Query options
}
```

**Example:**

```typescript
api.posts.$get({
  unwrapTo: 'json',
  useQueryOptions: {
    staleTime: 60000,
    enabled: true
  }
}).useQuery()
```

### Mutation Options (POST/PUT/PATCH/DELETE)

```typescript
{
  unwrapTo: 'json' | 'text' | 'arrayBuffer' | 'blob'
  useMutationOptions?: UseMutationOptions // React Query options
}
```

**Example:**

```typescript
const mutation = api.posts.$post({
  unwrapTo: 'json',
  useMutationOptions: {
    onSuccess: () => console.log('Created!'),
    onError: (error) => console.error(error)
  }
}).useMutation()

// Use the mutation
mutation.mutate({ 
  json: { title: 'New Post', content: 'Hello world' } 
})
```

### Response Types

Different `unwrapTo` options for various response formats:

```typescript
// JSON data
api.users.$get({ unwrapTo: 'json' })

// Plain text
api.docs.readme.$get({ unwrapTo: 'text' })

// Binary data
api.files[':id'].$get({ unwrapTo: 'blob' })

// Raw bytes
api.images[':id'].$get({ unwrapTo: 'arrayBuffer' })
```

## Extra

### Make it reusable

```typescript
import type {InferQueryRequestOptions} from "@hono-query/react"

import { type client, apiQueryClient } from "./client"

const useGetUser = (options: InferQueryRequestOptions<typeof client.users[":id"].$get>) => {
    return apiQueryClient.users[":id"].$get({
        unwrapTo: "json",
        ...options,
        useQueryOptions: {
            onSuccess: (data) => {
                // Do something with the data
            },
            ...options.useQueryOptions,
        }
    })
}
```

Alternatively, you can also do:

```typescript
import type {InferQueryRequestOptions} from "@hono-query/react"

import { type client, apiQueryClient } from "./client"

export const getUserQueryOptions = (options: InferQueryRequestOptions<typeof client.users[":id"].$get>) => {
  return apiQueryClient.users[":id"].$get({unwrapTo: "json", ...options}).queryOptions
}

const useGetUser = (options: InferQueryRequestOptions<typeof client.users[":id"].$get>) => {
  return apiQueryClient.users[":id"].$get(getUserQueryOptions(options))
}
```

### Query Key Builder

The library includes a query key builder utility that can be used to create consistent query keys for manual cache operations.

```typescript
import { hc } from 'hono/client'
import { createQueryKeyBuilder } from '@hono-query/react'

const client = hc<AppType>('/api')

// Create consistent query keys for manual cache operations
const queryKeyBuilder = createQueryKeyBuilder(client);

// Usage
queryClient.invalidateQueries({ 
  queryKey: queryKeyBuilder.users.$get({ params: { id: 1 } })
})
```

This is useful when you need to manually interact with the React Query cache, such as:

- Invalidating specific queries
- Setting query data programmatically  
- Prefetching queries
- Managing cache updates after mutations

The query key builder ensures consistency between your automatic proxy queries and manual cache operations.
