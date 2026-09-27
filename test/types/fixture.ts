/**
 * Type-only regression fixture for letterpress #9 and #11.
 *
 * Not executed -- test/types.test.mjs spawns `tsc --noEmit` over this file
 * (via the root tsconfig.json). It exists to catch regressions
 * automatically instead of relying on someone eyeballing types.d.ts/fs.d.ts:
 *
 *  1. Importing "@johnhenry/letterpress" (and its "/fs" subpath) by their
 *     published package names -- as any real consumer does -- must resolve
 *     to the shipped declarations. Before #9, package.json's `exports["."]`
 *     (and `exports["./fs"]`) had no `types` condition, so under
 *     Bundler/Node16/NodeNext module resolution TypeScript reported TS7016
 *     ("could not find a declaration file for module") even though a
 *     top-level `types` field existed -- that legacy field is not
 *     consulted once `exports` is present under this resolution mode.
 *  2. Even with the `types` condition wired up, types.d.ts declared only
 *     type *aliases* (Router, CreateRouter, CreateRoute, RouterInit, ...)
 *     with no *value* declarations for the actual exported functions, so
 *     `import { createRouter } from '@johnhenry/letterpress'` type-checked
 *     the module specifier but `createRouter` itself was still `any`/
 *     missing (TS2305 "has no exported member").
 *  3. `RouterExtension.endpoint`'s declared type didn't model that it's
 *     curried at runtime (#11): the first tagged-template call returns a
 *     responder that must be called a *second* time, either as another
 *     tagged template (a raw HTTP response literal) or with a single
 *     handler function, both returning `Router`. Before the fix, the first
 *     call's return type was `Router` itself (callable only via `Route`'s
 *     `(request: Request) => Response` signature), so both curried forms
 *     below failed to type-check.
 */
import {
  createRouter,
  createRoute,
  createRequest,
  createResponse,
  deconstruct,
  cook,
  HTTPExpression,
} from "@johnhenry/letterpress";
import { createFSRouter } from "@johnhenry/letterpress/fs";

// createRouter: a Router is a Route (request, context?) => Response, plus
// an `.endpoint` tagged-template extension that registers routes.
const router = createRouter({ baseUrl: "http://localhost" });
const extended = router.endpoint`GET /ping`;
void extended;

// `.endpoint` is curried (letterpress #11): the first tagged-template call
// (above) defines the match pattern and returns a responder that must be
// called a *second* time, either as another tagged template (a raw HTTP
// response literal) or with a single handler function -- both forms
// register the route and return the same Router. Neither form below should
// require @ts-expect-error/@ts-ignore.
const routerAfterTemplateResponse = router.endpoint`GET /protected [Authorization: Bearer *]`
`HTTP/1.1 200 OK
Content-Type: text/plain

This is a protected resource
`;
const routerAfterHandlerResponse = router.endpoint`GET /api/data`(
  async (request: Request) => {
    void request;
    return new Response("ok");
  }
);
void routerAfterTemplateResponse;
void routerAfterHandlerResponse;

async function checkRouter() {
  const response = await router(new Request("http://localhost/ping"));
  return response instanceof Response;
}
void checkRouter;

// createRoute: (init?) => tagged-template => Route
const routeTag = createRoute({ status: 200 });
const route = routeTag`Hello, ${"world"}!`;
async function checkRoute() {
  const response = await route(new Request("http://localhost/"));
  return response instanceof Response;
}
void checkRoute;

// createRequest: (init?) => tagged-template => Promise<Request>
async function checkRequest() {
  const request = await createRequest({ baseUrl: "http://localhost" })`
GET /
`;
  return request instanceof Request;
}
void checkRequest;

// createResponse: itself a tagged-template function => Response
async function checkResponse() {
  const response = await createResponse`
HTTP/1.1 200 OK

ok`;
  return response instanceof Response;
}
void checkResponse;

// deconstruct: tagged-template => { strings, substitutions, raw }
const deconstructed = deconstruct`GET /${"foo"}`;
const deconstructedStrings: string[] = deconstructed.strings;
const deconstructedSubstitutions: any[] = deconstructed.substitutions;
void deconstructedStrings;
void deconstructedSubstitutions;

// cook: tagged-template => string
const cooked: string = cook`GET /${"foo"}`;
void cooked;

// HTTPExpression: tagged-template => matcher with .test()/.exec()
const matcher = HTTPExpression`GET /users/:id`;
declare const incomingRequest: Request;
const isMatch: boolean = matcher.test(incomingRequest);
const execResult = matcher.exec(incomingRequest);
if (execResult) {
  const method: string = execResult.method;
  const headers: Headers = execResult.headers;
  void method;
  void headers;
}
void isMatch;

// createFSRouter: only reachable via the "/fs" subpath (not the main
// barrel), per index.mjs's browser-bundling comment.
const fsRouter = createFSRouter("/tmp/routes", (_request, context) => {
  const params: Record<string, string> = context.params;
  void params;
  return new Response("not found", { status: 404 });
});
async function checkFsRouter() {
  const response = await fsRouter(new Request("http://localhost/x"));
  return response === null || response instanceof Response;
}
void checkFsRouter;
