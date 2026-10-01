# Letterpress

[![npm version](https://img.shields.io/npm/v/%40johnhenry%2Fletterpress.svg)](https://www.npmjs.com/package/@johnhenry/letterpress)
[![CI](https://github.com/johnhenry/letterpress/actions/workflows/ci.yml/badge.svg)](https://github.com/johnhenry/letterpress/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/%40johnhenry%2Fletterpress.svg)](license)

Full documentation: [opensource.johnhenry.me/letterpress](https://opensource.johnhenry.me/letterpress/)

<img alt="Letterpress Logo" width="512" height="512" src="./logo.jpeg" style="width:512px;height:512px"/>

> Previously published as `leroute`, last unscoped version `0.0.1`. Now
> `@johnhenry/letterpress`, restarting at `0.0.0`.

Letterpress is a flexible and powerful routing library for handling HTTP requests and responses in JavaScript and TypeScript applications.

Letterpress works great with [leserve](https://www.npmjs.com/package/@johnhenry/leserve), a library for serving endpoints.

## Contents

- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Honest limitations](#honest-limitations)
- [Changelog](#-changelog)
- [Family](#family)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Features

- Intuitive API using tagged template strings for route creation
- Support for simple and complex routing patterns
- Flexible response generation using template literals
- Middleware support for request and response processing
- Streaming response capabilities
- Full TypeScript support with included type definitions

## 📦 Installation

```bash
npm install @johnhenry/letterpress
```

Or using yarn:

```bash
yarn add @johnhenry/letterpress
```

## 🛠 Usage

### Basic Example

```javascript
import serve from "@johnhenry/leserve";
import { createRouter, createRoute } from "@johnhenry/letterpress";

// Create a router
const router = createRouter();

// Define a simple route
router.endpoint`GET /``
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Letterpress</title>
  </head>
  <body>
    <h1>Welcome to Letterpress!</h1>
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
import serve from "@johnhenry/leserve";
import { createRouter, createRoute } from "@johnhenry/letterpress";

const router = createRouter();

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

### `createRouter(options?: RouterInit): Router`

Creates a new router instance.

#### Options:

- `baseUrl`: Base URL for all routes (optional)
- `defaultHandler`: Default route handler (optional)
- `errorHandler`: Custom error handler function (optional)
- `cache`: Caching options (optional)

### `router.mount(prefix: string, subHandler: Mountable): Router`

Delegates every request under `prefix` to `subHandler`, with the prefix
stripped from the forwarded request's path — e.g. `router.mount("/api",
apiRouter)` sends a request for `/api/users` to `apiRouter` as `/users`.
`subHandler` may be a plain `(Request) => Response` function or an object
exposing one as `.fetch` — a `Router` satisfies both, so one router can
mount another:

```javascript
const api = createRouter();
api.endpoint`GET /users``[]`;

const router = createRouter();
router.mount("/api", api); // GET /api/users -> api's GET /users
```

### `createRoute(options?: RouteInit): Route`

Creates a new route handler.

#### Options:

- `headers`: Initial headers for the response (optional)
- `status`: HTTP status code (optional)
- `statusText`: HTTP status text (optional)
- `streaming`: Enable streaming response (optional)

### `HTTPExpression`

A tagged-template function for matching HTTP requests against a method/path/header pattern.

```javascript
import { HTTPExpression } from "@johnhenry/letterpress";

const expr = HTTPExpression`GET /users/:id`;
expr.test(request); // boolean — does this request match?
expr.exec(request); // matched params (plus method/headers), or null
```

### `createRequest`, `createResponse`, `tagRequest`, `tagResponse`

Four tagged-template functions for building `Request`/`Response` objects
from raw HTTP-message-shaped template literals -- two pairs with a
deliberately different purpose, not two ways to do the same thing:

| | `createRequest` / `createResponse` | `tagRequest` / `tagResponse` |
|---|---|---|
| Purpose | convenient, forgiving builder | strict raw-HTTP-text parser |
| Request/status line | optional / defaulted | **required** -- throws without one |
| Header value containing `": "` | truncated | parses correctly |
| Repeated header name (e.g. `Set-Cookie`) | both kept | both kept |
| Interpolated value containing `\n`/`:` | re-tokenized as syntax | spliced in verbatim, never re-scanned |
| Function-valued interpolation | not supported | not supported (use `createRoute` for that) |
| Binary substitution (`Blob`/stream/etc.) | becomes the body | becomes the body, but **must be the sole body content** -- throws if combined with other text |

Reach for `tagRequest`/`tagResponse` when a template literal needs to
behave exactly like the HTTP text it looks like (tests, fixtures,
hand-authored wire-format examples); reach for `createRequest`/
`createResponse` for everyday convenience where partial specification is
fine. See [api.md](./api.md) for the full examples of both.

### `createFSRouter`

Builds a `Router` from a filesystem-based route directory.

```javascript
import { createFSRouter } from "@johnhenry/letterpress/fs";
```

> `createFSRouter` is imported from the `@johnhenry/letterpress/fs`
> subpath, not the main `@johnhenry/letterpress` barrel. It's the only
> piece of Letterpress that touches Node built-ins (`node:fs`, `node:path`)
> and the `theres-waldo` dependency, so it's kept out of the main entry
> point to keep that entry point bundler-friendly for browser use. Everything
> else (`createRouter`, `createRoute`, `createRequest`, `createResponse`,
> `tagRequest`, `tagResponse`, `HTTPExpression`) is pure and safe to bundle
> for the browser.

### `createRewriter`

Builds a request/response rewriter for target-URL/path rewriting -- e.g.
rewriting an inbound path before it reaches a route, or rewriting a
proxied response's headers/status on the way back out. Useful for proxy
middleware (rewrite the target URL/path of a proxied request, adjust
headers, force a status code) as well as plain routing (redirect old
paths to new ones).

```javascript
import { createRewriter } from "@johnhenry/letterpress/rewrite";

const rewriter = createRewriter([
  {
    match: { path: /^\/api\/v1\/(.*)/ },
    action: { rewritePath: "/api/v2/$1" },
  },
]);

// Wrap a handler: the handler receives the rewritten request, and its
// response is run back through the rewriter before being returned.
const handler = rewriter.middleware(async (request) => {
  const url = new URL(request.url);
  return new Response(`routed to ${url.pathname}`);
});

// Or call rewriteRequest/rewriteResponse directly, and manage rules with
// addRule/removeRule/getRules.
rewriter.addRule({ match: { path: "/teapot" }, action: { setStatus: 418 } });
```

> `createRewriter` is imported from the `@johnhenry/letterpress/rewrite`
> subpath, not the main `@johnhenry/letterpress` barrel, mirroring how
> `createFSRouter` is isolated on `@johnhenry/letterpress/fs` above.
>
> This existed in `leroute` (the package letterpress was renamed from --
> see the provenance note near the top of this README) but was dropped
> during that rename. It's ported here, discovered missing while porting a
> downstream consumer (`prism`, a request inspector/proxy) that relies on
> it for proxy-mode rewriting -- see CHANGELOG.md.

### `deconstruct`, `cook`

Lower-level utility functions used to parse and process tagged HTTP template literals. See [api.md](./api.md) for details.

> Note: `@johnhenry/letterpress` does not export a `serve` function. To actually run a server, pair it with [leserve](https://www.npmjs.com/package/@johnhenry/leserve) (or any server of your choice) as shown in the usage examples above.

## Honest limitations

- **`createRoute` template substitutions are not HTML-escaped.** A
  substitution value is inserted via `.toString()` and spliced directly
  into the response body; there is no auto-escaping step, even though the
  default `Content-Type` is `text/html`. Interpolating untrusted input
  (request params, headers, query values) directly into an
  `` router.endpoint`GET /...`` `` HTML template -- e.g.
  `` `<p>${(_, {params}) => params.id}</p>` `` -- reflects that value
  byte-for-byte into the response. Escape anything derived from the request
  yourself (e.g. a small HTML-escaping helper) before interpolating it, the
  same way you would with any other unescaped template-literal HTML
  response.
- **`createFSRouter`'s `index.html` handling evaluates the file as live
  JavaScript, not literal text.** To reuse `createRoute`'s own template
  engine for static `index.html` files, `fs-router.mjs` reads the file's
  raw content and splices it directly into a synthesized module string as
  a template literal (`` export default createRoute()`${file}` ``), then
  dynamically imports and runs that module. Any literal backtick or
  `${...}` sequence inside that `index.html` file is interpreted as real
  JavaScript in the synthesized module's scope, not rendered as text. This
  is fine for trusted, hand-authored `index.html` files (the intended use),
  but `index.html` files under a filesystem route tree should be treated as
  code, not as passive markup, if their contents are ever user-editable.

## 📜 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full history of changes.

## Family

Letterpress isn't a standalone server -- it deliberately doesn't export a
`serve` function (see the note at the end of the API Reference above), and
is designed to pair with a sibling package that does.

- **[`@johnhenry/leserve`](https://github.com/johnhenry/leserve)** -- a
  library for serving endpoints. `createRouter()`'s output (a `Route`
  function matching `(request, additionalContext) => Promise<Response>`) is
  exactly the shape `leserve`'s `serve()` accepts as its handler, so pairing
  the two needs no adapter -- `serve({ port }, router)`, as shown throughout
  this README's usage examples. Any other server that can call a
  `Route`-shaped function works too; `leserve` is the tested, documented
  pairing, not a hard dependency (it's a `devDependency` here, used only in
  the demo scripts).
- **[`@johnhenry/prism`](https://github.com/johnhenry/prism)** -- a live
  HTTP request inspector/proxy that uses `createRouter()` as its top-level
  router. Porting it surfaced two real gaps left over from letterpress's
  own rename from `leroute`: `router.mount()` (with the `ctx`-forwarding
  its `mountPrefix` depends on) and `createRewriter`
  (`@johnhenry/letterpress/rewrite`) -- both closed as part of that port,
  see CHANGELOG.md.

## 🤝 Contributing

We welcome contributions to Letterpress! Here's how you can help:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

Please make sure to update tests as appropriate and adhere to the existing coding style.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- Thanks to all contributors who have helped shape Letterpress
- Inspired by modern web development practices and the need for flexible routing solutions

## 📬 Contact

For questions, suggestions, or issues, please open an issue on the GitHub repository or contact the maintainers directly.

---

Happy routing with Letterpress! 🚀
