# @hono-query/react

## 0.2.6

### Patch Changes

- a77b65d: Fix dts bundling with internal package

## 0.2.5

### Patch Changes

- 735cba3: Improve build process + mjs build

## 0.2.4

### Patch Changes

- 4ab6133: Bump dev dependencies

## 0.2.3

### Patch Changes

- 2fffab8: Bump dev dependencies

## 0.2.2

### Patch Changes

- 606b907: Use query context without destructuring in order to avoid double query trigger under strict mode

## 0.2.1

### Patch Changes

- 2d10db6: Ensure url in query keys sort search params

## 0.2.0

### Minor Changes

- 4959cf6: (Breaking): now queryClient.$[method](...) return an object with {(query/mutation)Options: {}, use(Query/Mutation): () => {}}, this allow to be more flexible and use the query client for more use cases like query prefetching

## 0.1.0

### Minor Changes

- 8b7d62d: Allow to pass request option to proxied use query + automatically bind useQuery signal to api client method

## 0.0.9

### Patch Changes

- 1f4d256: Fix type issue where hc client method does not extends with ClientRequest type

## 0.0.8

### Patch Changes

- ae26699: fix issue where deep chained error are not inferred properly

## 0.0.7

### Patch Changes

- 7a02ca3: fix type inference by defining a broader RequestSchema like type in order to have better type inference

## 0.0.6

### Patch Changes

- 473ff10: Bump depencies and fix type issue where nested method are not properly handled

## 0.0.5

### Patch Changes

- 85cdc62: Missing package exports

## 0.0.4

### Patch Changes

- b547e0e: Dts bundling and mark external dependencies

## 0.0.3

### Patch Changes

- f39c323: Republish with readme

## 0.0.2

### Patch Changes

- 55ef695: Include readme into packge tarball

## 0.0.1

### Patch Changes

- 2d8d192: Initial release
