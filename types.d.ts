// Represents a route handler function
export type Route = (
  request: Request,
  context?: Record<string, any>
) => Response | Promise<Response>;

// The value returned by the *first* `router.endpoint` tagged-template call
// (the method/path/header match pattern, e.g.
// `` router.endpoint`GET /protected [Authorization: Bearer *]` ``). That
// return value is itself curried: it must be called a *second* time,
// either as another tagged template supplying a raw HTTP response literal
// (e.g. `` `HTTP/1.1 200 OK\n\n...` ``, parsed the same way createResponse
// parses one) or with a single plain handler function
// (`(request: Request) => Response`), per the README's documented usage
// and create-router.mjs's actual implementation. Both forms register the
// route and return the same `Router` so calls can be chained.
export type RouterEndpointResponder = {
  (template: TemplateStringsArray, ...substitutions: any[]): Router;
  (handler: Route): Router;
};

// A handler mountable under a Router prefix: a plain (Request) => Response
// function, or an object exposing one as `.fetch` (so a Router can mount
// another Router).
export type Mountable = Route | { fetch: Route };

// Extension for the Router to add endpoints
export type RouterExtension = {
  endpoint: (
    template: TemplateStringsArray,
    ...substitutions: any[]
  ) => RouterEndpointResponder;
  mount: (prefix: string, subHandler: Mountable) => Router;
};

// Combines Route and RouterExtension
export type Router = Route & RouterExtension;

// Configuration options for a Route
export type RouteInit = {
  headers?: HeadersInit | Headers;
  status?: number;
  statusText?: string;
  streaming?: boolean;
};

// Middleware for Route
export type RouteMiddleware =
  | RouteInit
  | ((request: Request) => RouteInit);

// Function to create a Route
export type CreateRoute = (
  init?: RouteMiddleware
) => (template: TemplateStringsArray, ...substitutions: any[]) => Route;

// Configuration options for a Router
export type RouterInit = {
  baseUrl?: string;
  defaultHandler?: Route;
  errorHandler?: (
    error: Error,
    request: Request
  ) => Response | Promise<Response>;
  cache?: CacheOptions;
};

// Middleware for Router
export type RouterMiddleware =
  | RouterInit
  | ((request: Request) => RouterInit);

// Function to create a Router
export type CreateRouter = (init?: RouterMiddleware) => Router;

// Cache options
export type CacheOptions = {
  // Add cache-related options here
};

// InlineParam options
export type InlineParamOptions = {
  name: string;
  optional?: boolean;
  type?: "string" | "number" | "boolean";
  default?: any;
  cast?: (value: string) => any;
  max?: number;
  min?: number;
  array?: boolean;
  delimiter?: string;
};

// HeaderMatch options
export type HeaderMatchOptions = {
  name: string;
  value?: string;
  operator?: "=" | "^=" | "$=" | "~=" | "*=" | ">" | "<" | ">=" | "<=";
  negate?: boolean;
  set?: string[];
  range?: [number, number];
  rangeInclusive?: [boolean, boolean];
};

export type InlineParam = (options: InlineParamOptions) => string;
export type HeaderMatch = (options: HeaderMatchOptions) => string;

// Configuration options for createRequest
export type CreateRequestInit = {
  baseUrl?: string;
  setRetroactiveHeaders?: boolean;
};

// Tagged-template function returned by createRequest(), builds a Request
// from an HTTP-request-shaped template literal (request line, headers,
// blank line, body).
export type CreateRequestTag = (
  template: TemplateStringsArray,
  ...substitutions: any[]
) => Promise<Request>;

// Function to create a createRequest tagged-template function
export type CreateRequest = (init?: CreateRequestInit) => CreateRequestTag;

// createResponse is itself a tagged-template function (not a factory that
// returns one): it builds a Response directly from an
// HTTP-response-shaped template literal.
export type CreateResponse = (
  template: TemplateStringsArray,
  ...substitutions: any[]
) => Response | Promise<Response>;

// Configuration/sugar for tagRequest(). Unlike CreateRequestInit, these
// fields only ever fill in what raw HTTP text can't express -- method,
// URL, status, and body always come from the parsed template itself, not
// from defaults. `host` is sugar for headers.host; providing both throws.
export type TagRequestDefaults = {
  headers?: HeadersInit | Headers;
  host?: string;
  baseUrl?: string;
  redirect?: RequestRedirect;
  credentials?: RequestCredentials;
  mode?: RequestMode;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal;
};

// Tagged-template function returned by tagRequest(): a strict, from-scratch
// parser of raw HTTP-request text (see README's "which one do I want?"
// note comparing this to createRequest). Substitutions are spliced in
// verbatim -- never re-scanned for "\n"/":" -- and a binary-typed
// substitution (Blob/Uint8Array/ArrayBuffer/ReadableStream/FormData/
// URLSearchParams) must be the sole content of the body.
export type TagRequestTag = (
  template: TemplateStringsArray,
  ...substitutions: any[]
) => Promise<Request>;

export type TagRequest = (defaults?: TagRequestDefaults) => TagRequestTag;

// tagResponse is itself the tagged-template function (uncurried, like
// createResponse) -- there is no defaults-currying form in this version.
export type TagResponse = (
  template: TemplateStringsArray,
  ...substitutions: any[]
) => Promise<Response>;

// Result of deconstruct(): the raw pieces of a tagged template call.
export type DeconstructResult = {
  strings: string[];
  substitutions: any[];
  raw: readonly string[];
};

// deconstruct: pulls a tagged template call apart into its strings/
// substitutions/raw pieces without any further processing.
export type Deconstruct = (
  template: TemplateStringsArray,
  ...substitutions: any[]
) => DeconstructResult;

// cook: re-assembles a tagged template call's strings/substitutions back
// into a single string (the "cooked" value), per
// https://2ality.com/2016/11/computing-tag-functions.html
export type Cook = (
  template: TemplateStringsArray,
  ...substitutions: any[]
) => string;

// Result of matching an HTTPExpression against a Request: the named path
// parameters plus the matched method and the request's headers.
export type HTTPExpressionMatch = {
  [param: string]: string;
} & {
  method: string;
  headers: Headers;
};

// The tagged-template matcher object returned by HTTPExpression().
export type HTTPExpressionMatcher = {
  test(request: Request): boolean;
  exec(request: Request): HTTPExpressionMatch | null;
};

// HTTPExpression: a tagged-template function that builds a request
// matcher (method + path pattern + optional header matchers) usable via
// `.test(request)` / `.exec(request)`.
export type HTTPExpressionFn = (
  template: TemplateStringsArray,
  ...substitutions: any[]
) => HTTPExpressionMatcher;

// Value declarations for the actual named exports of index.mjs (and the
// utility/index.mjs re-exports it pulls in). An `exports` map with no
// `types` condition makes TypeScript ignore the legacy top-level `types`
// field entirely under Bundler/Node16/NodeNext resolution, and even once
// that's fixed (see package.json's `exports["."].types`), aliases alone
// (above) don't type the values a consumer actually imports -- see
// https://github.com/johnhenry/letterpress/issues/9.
export declare const createRouter: CreateRouter;
export declare const createRoute: CreateRoute;
export declare const createRequest: CreateRequest;
export declare const createResponse: CreateResponse;
export declare const tagRequest: TagRequest;
export declare const tagResponse: TagResponse;
export declare const deconstruct: Deconstruct;
export declare const cook: Cook;
export declare const HTTPExpression: HTTPExpressionFn;
