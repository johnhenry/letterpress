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

  const router = async (request) => {
    try {
      for (const [matcher, handler] of routes) {
        const match = matcher(request);
        if (match) {
          // Awaiting here (rather than returning the handler's promise
          // directly) is required so that a handler that throws inside an
          // async function (i.e. rejects its returned promise) is still
          // caught below and routed to errorHandler.
          return await handler(request, { ...init, ...match });
        }
      }
      return await defaultHandler(request);
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
  return router;
};
