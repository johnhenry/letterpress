// Represents a route handler function
export type Route = (
  request: Request,
  context?: Record<string, any>
) => Response | Promise<Response>;

// Extension for the Router to add endpoints
export type RouterExtension = {
  endpoint: (
    template: TemplateStringsArray,
    ...substitutions: any[]
  ) => Router;
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
