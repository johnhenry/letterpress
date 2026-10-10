/**
 * @file rewrite.mjs
 * @description Create a request/response rewriter for target-URL/path
 * rewriting -- e.g. rewriting an inbound path before it reaches a route, or
 * rewriting a proxied response's headers/status on the way back out.
 *
 * This existed in `leroute` (the package letterpress was renamed from --
 * see the README's provenance note) as `createRewriter`, but was dropped
 * during the leroute -> @johnhenry/letterpress rename. It's ported here
 * unchanged in behavior, discovered missing while porting a downstream
 * consumer (a private request inspector/proxy) that relies on it for
 * proxy-mode rewriting.
 *
 * Rules format:
 *   {
 *     match: { path?: string|RegExp, method?: string },
 *     action: {
 *       setHeader?: { [name]: value },
 *       removeHeader?: string[],
 *       rewritePath?: string,          // replacement string (supports $1 from regex)
 *       setStatus?: number,            // response only
 *     }
 *   }
 *
 * @param {Array} [initialRules=[]]
 */
export const createRewriter = (initialRules = []) => {
  const rules = [...initialRules];

  const matches = (rule, request) => {
    if (!rule.match) return true;
    const url = new URL(request.url);
    if (rule.match.method && rule.match.method.toUpperCase() !== request.method) {
      return false;
    }
    if (rule.match.path) {
      const pattern = rule.match.path;
      if (pattern instanceof RegExp) {
        return pattern.test(url.pathname);
      }
      // String match — treat as prefix or exact
      if (!url.pathname.startsWith(pattern)) return false;
    }
    return true;
  };

  const rewriteRequest = (request) => {
    let url = new URL(request.url);
    let headers = new Headers(request.headers);
    let pathChanged = false;

    for (const rule of rules) {
      if (!matches(rule, request)) continue;
      const action = rule.action || {};

      if (action.setHeader) {
        for (const [name, value] of Object.entries(action.setHeader)) {
          headers.set(name, value);
        }
      }
      if (action.removeHeader) {
        for (const name of action.removeHeader) {
          headers.delete(name);
        }
      }
      if (action.rewritePath) {
        if (rule.match?.path instanceof RegExp) {
          url.pathname = url.pathname.replace(rule.match.path, action.rewritePath);
        } else {
          url.pathname = action.rewritePath;
        }
        pathChanged = true;
      }
    }

    if (pathChanged || !headersEqual(headers, request.headers)) {
      return new Request(url, {
        method: request.method,
        headers,
        body: request.body,
        duplex: "half",
      });
    }
    return request;
  };

  const rewriteResponse = (response, request) => {
    let headers = new Headers(response.headers);
    let status = response.status;
    let statusText = response.statusText;
    let changed = false;

    for (const rule of rules) {
      // When request is provided, filter rules through matches()
      // Rules with no match clause still apply globally
      if (request && !matches(rule, request)) continue;

      const action = rule.action || {};
      if (action.setHeader) {
        for (const [name, value] of Object.entries(action.setHeader)) {
          headers.set(name, value);
        }
        changed = true;
      }
      if (action.removeHeader) {
        for (const name of action.removeHeader) {
          headers.delete(name);
        }
        changed = true;
      }
      if (action.setStatus) {
        status = action.setStatus;
        changed = true;
      }
    }

    if (changed) {
      return new Response(response.body, { status, statusText, headers });
    }
    return response;
  };

  /**
   * Wraps a Route-shaped handler ((request, context) => Response) with
   * request/response rewriting: the handler receives the rewritten
   * request, and the handler's response is then run through
   * rewriteResponse before being returned.
   * @param {Function} next - The next handler: (request, context) => Response
   * @returns {Function} Wrapped handler: (request, context) => Response
   */
  const middleware = (next) => async (request, context) => {
    const rewrittenReq = rewriteRequest(request);
    const response = await next(rewrittenReq, context);
    return rewriteResponse(response, request);
  };

  const addRule = (rule) => {
    // Convert path string to regex if it looks like one
    if (rule.match?.path && typeof rule.match.path === "string" && rule.match.path.startsWith("/") && rule.match.path.endsWith("/")) {
      const inner = rule.match.path.slice(1, -1);
      try {
        rule.match.path = new RegExp(inner);
      } catch {
        throw new Error(`Invalid regex pattern: ${rule.match.path}`);
      }
    }
    rules.push(rule);
  };

  const removeRule = (index) => {
    if (index >= 0 && index < rules.length) {
      rules.splice(index, 1);
    }
  };

  const getRules = () =>
    rules.map((r, i) => ({
      index: i,
      match: {
        path: r.match?.path instanceof RegExp ? r.match.path.source : r.match?.path,
        method: r.match?.method,
      },
      action: r.action,
    }));

  return { middleware, rewriteRequest, rewriteResponse, addRule, removeRule, getRules };
};

const headersEqual = (a, b) => {
  const aEntries = [...a].sort(([k1], [k2]) => k1.localeCompare(k2));
  const bEntries = [...b].sort(([k1], [k2]) => k1.localeCompare(k2));
  if (aEntries.length !== bEntries.length) return false;
  return aEntries.every(([k, v], i) => bEntries[i][0] === k && bEntries[i][1] === v);
};

export default createRewriter;
