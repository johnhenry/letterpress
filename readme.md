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
import serve from "serve-cold";
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
import { createLeRouter, createLeRoute, serve } from "leroute";

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

### `serve(options: { port: number }, handler: LeRoute | LeRouter, serverOptions?: object): void`

Starts a server with the given handler.

## 📜 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

This project will adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches 1.0.0.

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
