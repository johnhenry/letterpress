// Type declarations for the @johnhenry/letterpress/rewrite subpath.
//
// createRewriter is a request/response rewriter for target-URL/path
// rewriting (e.g. rewriting an inbound path before it reaches a route, or
// rewriting a proxied response's headers/status on the way back out). It
// existed in `leroute` (the package letterpress was renamed from) but was
// dropped during that rename; it's kept on its own subpath here (rather
// than the main barrel) to mirror how `./fs` is isolated -- see
// rewrite.mjs's top-of-file comment and CHANGELOG.md.

export type RewriteMatch = {
  path?: string | RegExp;
  method?: string;
};

export type RewriteAction = {
  setHeader?: Record<string, string>;
  removeHeader?: string[];
  // Replacement string for the matched path; supports `$1`-style regex
  // capture group references when `match.path` is a RegExp.
  rewritePath?: string;
  // Response only.
  setStatus?: number;
};

export type RewriteRule = {
  match?: RewriteMatch;
  action?: RewriteAction;
};

// The shape returned by getRules(): a rule with its index in the rule
// list, and any RegExp `match.path` normalized back to its `.source`
// string.
export type RewriteRuleSnapshot = {
  index: number;
  match: {
    path?: string;
    method?: string;
  };
  action?: RewriteAction;
};

// Wraps a Route-shaped handler ((request, context) => Response) with
// request/response rewriting.
export type RewriterMiddleware = (
  next: (request: Request, context?: Record<string, any>) => Response | Promise<Response>
) => (request: Request, context?: Record<string, any>) => Promise<Response>;

export type Rewriter = {
  middleware: RewriterMiddleware;
  rewriteRequest: (request: Request) => Request;
  rewriteResponse: (response: Response, request?: Request) => Response;
  addRule: (rule: RewriteRule) => void;
  removeRule: (index: number) => void;
  getRules: () => RewriteRuleSnapshot[];
};

export type CreateRewriter = (initialRules?: RewriteRule[]) => Rewriter;

export declare const createRewriter: CreateRewriter;
export default createRewriter;
