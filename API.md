# Letterpress API Documentation

## Table of Contents

1. [createRouter](#createRouter)
2. [createRoute](#createRoute)
3. [Utility Functions](#utility-functions)

## createRouter

Creates a new router instance.

```typescript
function createRouter(init?: RouterInit): Router;
```

### Parameters

- `init` (optional): Configuration options for the router

  ```typescript
  type RouterInit = {
    baseUrl?: string;
    defaultHandler?: Route;
    errorHandler?: (
      error: Error,
      request: Request
    ) => Response | Promise<Response>;
    cache?: CacheOptions;
  };
  ```

### Returns

Returns a `Router` instance, which is a function that can be used as a request handler and also has an `endpoint` method for defining routes.

### Example

```javascript
import { createRouter } from "@johnhenry/letterpress";

const router = createRouter({
  baseUrl: "https://api.example.com",
  errorHandler: (error, request) => {
    console.error("Error:", error);
    return new Response("An error occurred", { status: 500 });
  },
});

router.endpoint`GET /users/:id`(async (request, { params }) => {
  // Handle the request
});
```

## createRoute

Creates a new route handler.

```typescript
function createRoute(
  init?: RouteInit
): (template: TemplateStringsArray, ...substitutions: any[]) => Route;
```

### Parameters

- `init` (optional): Configuration options for the route

  ```typescript
  type RouteInit = {
    headers?: HeadersInit | Headers;
    status?: number;
    statusText?: string;
    streaming?: boolean;
  };
  ```

### Returns

Returns a function that takes a template literal and returns a `Route` (a request handler function).

### Example

```javascript
import { createRoute } from "@johnhenry/letterpress";

const userRoute = createRoute({ streaming: true })`
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": ${(_, { params }) => params.id},
  "name": "John Doe",
  "email": "john@example.com"
}
`;
```

## Utility Functions

Letterpress provides several utility functions to help with request and response handling:

> Note: `@johnhenry/letterpress` does not export a `serve` function or a `tagRequest` function. To run a server, pair it with [leserve](https://www.npmjs.com/package/@johnhenry/leserve) (imported directly, e.g. `import serve from "@johnhenry/leserve"`) or any server of your choice. To build a `Request` from a template literal, use `createRequest` (see below).

### createRequest

Creates a new `Request` object from a template literal.

```javascript
import { createRequest } from "@johnhenry/letterpress";

const request = await createRequest()`
GET /api/users HTTP/1.1
Accept: application/json
`;
```

### createResponse

Creates a new `Response` object from a template literal.

```javascript
import { createResponse } from "@johnhenry/letterpress";

const response = await createResponse`
HTTP/1.1 200 OK
Content-Type: application/json

{"message": "Hello, World!"}
`;
```

### HTTPExpression

A tagged-template function for matching HTTP requests against a method/path/header pattern. It returns an object with `test(request)` and `exec(request)` methods — not `.method`/`.path`/`.version` properties.

```javascript
import { HTTPExpression } from "@johnhenry/letterpress";

const expr = HTTPExpression`GET /users/:id`;

expr.test(new Request("https://example.com/users/123")); // true

expr.exec(new Request("https://example.com/users/123"));
// { id: '123', method: 'GET', headers: Headers {} }
```

### deconstruct

A low-level tagged-template helper that breaks a template literal down into its raw pieces, without evaluating substitutions into a final string. Returns `{ strings, substitutions, raw }`.

```javascript
import { deconstruct } from "@johnhenry/letterpress";

const { strings, substitutions, raw } = deconstruct`
POST /api/users HTTP/1.1
Content-Type: application/json

{"name": "${"John Doe"}"}
`;
```

### cook

A low-level tagged-template helper that concatenates a template literal's strings and substitutions back into a single string (the inverse of `deconstruct`).

```javascript
import { cook } from "@johnhenry/letterpress";

const message = cook`GET /api/users/${123} HTTP/1.1`;
// "GET /api/users/123 HTTP/1.1"
```

This API documentation provides an overview of the main functions and utilities provided by the Letterpress library. For more detailed information on specific use cases and advanced features, please refer to the README.md and the source code.
