---
"@hono-query/react": minor
---

(Breaking): now queryClient.$[method](...) return an object with {(query/mutation)Options: {}, use(Query/Mutation): () => {}}, this allow to be more flexible and use the query client for more use cases like query prefetching
