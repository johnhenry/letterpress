import { createRoute } from "./create-route.mjs";
import { HTTPExpression } from "./utility/http-expression.mjs";
/** @type {CreateRouter} */
export const createRouter = (initial = {}) => {
  const routes = [];
  const {
    defaultHandler = (request) =>
      new Response("404 Not Found", { status: 404 }),
    errorHandler = (error, request) =>
      new Response("500 Internal Server Error", { status: 500 }),
    ...init
  } = initial;

  // `ctx` is an optional caller-supplied context object (e.g. `.mount()`
  // uses it to pass `mountPrefix` down to a mounted sub-router) merged
  // underneath the router's own `init` and the matched route's own params --
  // so a route's own params can't be shadowed by a mount's ctx, but a
  // handler can still read whatever the caller passed in.
  const router = async (request, ctx = {}) => {
    try {
      for (const [matcher, handler] of routes) {
        const match = matcher(request);
        if (match) {
          // Awaiting here (rather than returning the handler's promise
          // directly) is required so that a handler that throws inside an
          // async function (i.e. rejects its returned promise) is still
          // caught below and routed to errorHandler.
          return await handler(request, { ...ctx, ...init, ...match });
        }
      }
      return await defaultHandler(request, ctx);
    } catch (error) {
      return errorHandler(error, request);
    }
  };

  router.endpoint = (strings, ...substitutions) => {
    const matcher = (request) => {
      const match = HTTPExpression(strings, ...substitutions).exec(request);
      if (!match) {
        return null;
      }
      const { method, headers, ...params } = match;
      return { params, method, headers };
    };

    return (values, ...substitutions) => {
      const handler =
        typeof values === "function"
          ? values
          : // `context` here is the per-request object the router dispatch
            // builds as `{ ...init, ...match }`, i.e. it includes `headers`
            // set to the *request's* Headers (see matcher above) so that
            // substitution functions can read `context.headers`. It must
            // NOT be used as the RouteInit passed to createRoute, or
            // the request's headers (Cookie, Authorization, etc.) would be
            // used to seed - and thus leak into - the response headers.
            // createRoute is given only the router-level `init` instead.
            (request, context) =>
              createRoute(init)(values, ...substitutions)(request, context);
      routes.push([matcher, handler]);
      return router;
    };
  };

  // Delegate every request under `prefix` to `subHandler`, with the prefix
  // stripped from the forwarded request's path -- e.g. `router.mount("/api",
  // apiRouter)` sends a request for `/api/users` to `apiRouter` as `/users`.
  // `subHandler` may be a plain `(Request) => Response` function or an
  // object exposing one as `.fetch` (matching how `Router` itself works, so
  // one router can mount another).
  router.mount = (prefix, subHandler) => {
    const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;

    const matcher = (request) => {
      const url = new URL(request.url);
      if (
        url.pathname === normalizedPrefix ||
        url.pathname.startsWith(normalizedPrefix + "/")
      ) {
        return { params: {}, method: request.method, headers: {} };
      }
      return null;
    };

    const handler = (request) => {
      const url = new URL(request.url);
      const newPath = url.pathname.slice(normalizedPrefix.length) || "/";
      const newUrl = new URL(newPath + url.search + url.hash, url.origin);

      const hasBody = request.method !== "GET" && request.method !== "HEAD";
      const newRequest = new Request(newUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: hasBody ? request.body : undefined,
        duplex: hasBody ? "half" : undefined,
      });

      const sub = typeof subHandler === "function" ? subHandler : subHandler.fetch;
      return sub(newRequest, { mountPrefix: normalizedPrefix });
    };

    routes.push([matcher, handler]);
    return router;
  };

  return router;
};
