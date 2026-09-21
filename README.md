# Letterpress

[![npm version](https://badge.fury.io/js/%40johnhenry%2Fletterpress.svg)](https://www.npmjs.com/package/@johnhenry/letterpress)
[![CI](https://github.com/johnhenry/letterpress/actions/workflows/ci.yml/badge.svg)](https://github.com/johnhenry/letterpress/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<img alt="Letterpress Logo" width="512" height="512" src="./logo.jpeg" style="width:512px;height:512px"/>

> Previously published as `leroute`, last unscoped version `0.0.1`. Now
> `@johnhenry/letterpress`, restarting at `0.0.0`.

Letterpress is a flexible and powerful routing library for handling HTTP requests and responses in JavaScript and TypeScript applications.

Letterpress works great with [leserve](https://www.npmjs.com/package/@johnhenry/leserve), a library for serving endpoints.

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

### `createRequest`, `createResponse`

Tagged-template functions for building `Request`/`Response` objects from raw HTTP-message-shaped template literals. See [api.md](./api.md) for details.

### `createFSRouter`

Builds a `Router` from a filesystem-based route directory.

### `deconstruct`, `cook`

Lower-level utility functions used to parse and process tagged HTTP template literals. See [api.md](./api.md) for details.

> Note: `@johnhenry/letterpress` does not export a `serve` function. To actually run a server, pair it with [leserve](https://www.npmjs.com/package/@johnhenry/leserve) (or any server of your choice) as shown in the usage examples above.

## 📜 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full history of changes.

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
