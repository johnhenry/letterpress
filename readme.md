# LeRoute

[![npm version](https://badge.fury.io/js/leroute.svg)](https://badge.fury.io/js/leroute)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<img alt="LeRoute Logo" width="512" height="512" src="./logo.jpeg" style="width:512px;height:512px"/>

LeRoute is a flexible and powerful routing library for handling HTTP requests and responses in JavaScript and TypeScript applications.

LeRoute works greate with [LeServe](https://www.npmjs.com/package/leserve), a library for serving endpoints.

## 🚀 Features

- Intuitive API using tagged template strings for route creation
- Support for simple and complex routing patterns
- Flexible response generation using template literals
- Middleware support for request and response processing
- Streaming response capabilities
- Full TypeScript support with included type definitions

## 📦 Installation

```bash
npm install leroute
```

Or using yarn:

```bash
yarn add leroute
```

## 🛠 Usage

### Basic Example

```javascript
import serve from "leserve";
import { createLeRouter, createLeRoute } from "leroute";

// Create a router
const router = createLeRouter();

// Define a simple route
router.endpoint`GET /``
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to LeRoute</title>
  </head>
  <body>
    <h1>Welcome to LeRoute!</h1>
    <p>The current time is: ${() => new Date().toISOString()}</p>
  </body>
</html>
`;

// Define a route with parameters
router.endpoint`GET /user/:id``
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Profile</title>
  </head>
  <body>
    <h1>User Profile</h1>
    <p>User ID: ${(_, { params }) => params.id}</p>
  </body>
</html>
`;

// Start the server
serve({ port: 8080 }, router);
```

### Advanced Usage

```javascript
import serve from "leserve";
import { createLeRouter, createLeRoute } from "leroute";

const router = createLeRouter();

// JSON API endpoint
router.endpoint`GET /api/data`(async (request) => {
  const data = {
    message: "Hello, World!",
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});

// Protected route with header matching
router.endpoint`GET /protected [Authorization: Bearer *]``
HTTP/1.1 200 OK
Content-Type: text/plain

This is a protected resource
`;

// Custom error handling
router.endpoint`GET /error`(() => {
  throw new Error("Intentional error");
});

const errorHandler = (error, request) => {
  console.error("Error:", error);
  return new Response("An error occurred", { status: 500 });
};

serve({ port: 8080 }, router, { errorHandler });
```

## 📘 API Reference

### `createLeRouter(options?: LeRouterInit): LeRouter`

Creates a new router instance.

#### Options:

- `baseUrl`: Base URL for all routes (optional)
- `defaultHandler`: Default route handler (optional)
- `errorHandler`: Custom error handler function (optional)
- `cache`: Caching options (optional)

### `createLeRoute(options?: LeRouteInit): LeRoute`

Creates a new route handler.

#### Options:

- `headers`: Initial headers for the response (optional)
- `status`: HTTP status code (optional)
- `statusText`: HTTP status text (optional)
- `streaming`: Enable streaming response (optional)

### `HTTPExpression`

A tagged-template function for matching HTTP requests against a method/path/header pattern.

```javascript
import { HTTPExpression } from "leroute";

const expr = HTTPExpression`GET /users/:id`;
expr.test(request); // boolean — does this request match?
expr.exec(request); // matched params (plus method/headers), or null
```

### `createRequest`, `createResponse`

Tagged-template functions for building `Request`/`Response` objects from raw HTTP-message-shaped template literals. See [api.md](./api.md) for details.

### `createFSRouter`

Builds a `LeRouter` from a filesystem-based route directory.

### `deconstruct`, `cook`

Lower-level utility functions used to parse and process tagged HTTP template literals. See [api.md](./api.md) for details.

> Note: `leroute` does not export a `serve` function. To actually run a server, pair `leroute` with [leserve](https://www.npmjs.com/package/leserve) (or any server of your choice) as shown in the usage examples above.

## 📜 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

This project will adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches 1.0.0.

### [Unreleased]

#### Fixed

- 🐛 `test/index.mjs` imported `lerouter.mjs` twice and never imported `leroute.mjs`, silently dropping the `createLeRoute` test suite from `npm test`
- 🐛 `test/leroute.mjs` imported `createLeRoute` from `create-lerouter.mjs` (which doesn't export it) instead of `create-leroute.mjs`, which would have thrown once the missing import above was fixed
- 🐛 `package.json` declared `"license": "ISC"` while the `LICENSE` file and README badge are MIT; changed to `"license": "MIT"` to match
- 📝 README and API docs referenced `serve` and `tagRequest` as exports of `leroute`; neither is exported — `serve` comes from the separate `leserve` package, and `tagRequest` doesn't exist. Docs corrected to list the real exports
- 📝 API docs showed `HTTPExpression(...)` as a constructor with `.method`/`.path`/`.version` properties; corrected to show it as a tagged-template function returning `{ test(request), exec(request) }`
- 🔒 **Security**: `router.endpoint` reused the per-request context object (which carries the incoming request's `Headers`) as the response-init object passed to `createLeRoute`, so every incoming request header — `Authorization`, `Cookie`, arbitrary custom headers — was echoed back on every response
- 🐛 `createLeRouter`'s dispatch loop called `handler(request, ctx)` without `await`, so an async handler that threw was never caught by the configured `errorHandler`/`defaultHandler` and instead crashed as an unhandled rejection
- 🐛 `createLeRoute` threw `Cannot read properties of null/undefined (reading 'toString')` on a `${null}`/`${undefined}` substitution instead of rendering nothing (ordinary template-literal semantics), even though a substitution *function* returning `undefined` was already treated as "no output"
- 🐛 A substitution *function* returning a `ReadableStream`/`Blob`/`ArrayBuffer`/`Uint8Array` fell through to `.toString()`, producing the literal string `"[object ReadableStream]"` instead of streaming the actual content (direct substitutions of these types already worked correctly)
- 🐛 `utility/dynamic-run.mjs` unconditionally attempted to `fs.unlink()` its temp file even when `fs.writeFile()` itself had failed, masking the real write error behind a misleading `ENOENT` — which `fs-router.mjs` then silently treated as "route not found" instead of surfacing a genuine permissions/disk-full failure. A cleanup (`unlink`) failure *after* a successful import also discarded the successful result
- 🐛 `fs-router.mjs`'s `index.html` handling wrote its synthesized temp module into leroute's own installed package directory instead of the matched route's directory — breaking the feature entirely in any deployment where the package install directory is read-only (containers, CI-built images)

#### Added

- `"types"` field in `package.json` pointing to the existing `types.d.ts`
- A real `description` and `keywords` in `package.json` (previously empty)

#### Removed

- Deleted `utility/cd.mjs`, an unused debug scratch file with no imports and no tests

### [0.0.0] - 2024-08-26

#### Added

- 🎉 Initial release of LeRoute
- 🛠 Core routing functionality
- 🛠 HTTP request and response handling
- 🛠 TypeScript definitions
- 🛠 Support for route parameters and query strings

## 🤝 Contributing

We welcome contributions to LeRoute! Here's how you can help:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

Please make sure to update tests as appropriate and adhere to the existing coding style.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- Thanks to all contributors who have helped shape LeRoute
- Inspired by modern web development practices and the need for flexible routing solutions

## 📬 Contact

For questions, suggestions, or issues, please open an issue on the GitHub repository or contact the maintainers directly.

---

Happy routing with LeRoute! 🚀
