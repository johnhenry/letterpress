import { parseHttpText } from "./utility/parse-http-text.mjs";

const DEFAULT_REQUEST = () => new Request("http://.");

// Same rule tag-request.mjs/tag-response.mjs use: the first occurrence of
// a header name overwrites whatever was already set (e.g. from `init`),
// a second-or-later occurrence of the *same name* accumulates instead of
// overwriting it. Fixes the Set-Cookie-overwrite bug this file used to
// have (headers.set() for every line, unconditionally).
const mergeHeaderEntries = (headers, headerEntries) => {
  const seen = new Set();
  for (const { name, value } of headerEntries) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
      seen.add(key);
    }
  }
};

export const createRoute = (initOrMiddleware) => {
  const getInit =
    typeof initOrMiddleware === "function"
      ? initOrMiddleware
      : () => initOrMiddleware || {};

  return (strings, ...substitutions) => {
    return async (request = DEFAULT_REQUEST(), additionalContext = {}) => {
      const init = getInit(request);
      const headers = new Headers(init.headers);
      let status = init.status || 200;
      let statusText = init.statusText || "OK";
      const streaming = init.streaming || false;

      const context = {
        setHeader: (name, value) => headers.set(name, value),
        setStatus: (newStatus, newStatusText) => {
          status = newStatus;
          statusText = newStatusText;
        },
        setStatusText: (newStatusText) => {
          statusText = newStatusText;
        },
        response: {
          headers: headers,
        },
        ...additionalContext,
      };

      // Resolve every function-valued substitution up front -- this is
      // create-route's one feature the shared parser doesn't (and
      // shouldn't) know about: a substitution can run arbitrary async
      // work and mutate `context` (headers/status) as a side effect, in
      // addition to contributing a value to the template. `null`/
      // `undefined` are preserved (parseHttpText already treats either as
      // "contributes nothing," matching ordinary JS template semantics).
      const resolvedSubstitutions = [];
      for (const sub of substitutions) {
        resolvedSubstitutions.push(
          typeof sub === "function" ? await sub(request, context) : sub
        );
      }

      const { startLine, headerEntries, body } = parseHttpText(
        strings,
        resolvedSubstitutions,
        {
          isStartLine: (line) => line.startsWith("HTTP/"),
          trimBodyLines: true,
        }
      );

      if (startLine !== null) {
        const [, statusCodeText, ...statusTextParts] = startLine.split(" ");
        const parsedStatus = parseInt(statusCodeText, 10);
        if (!Number.isNaN(parsedStatus)) {
          status = parsedStatus;
          statusText = statusTextParts.join(" ");
        }
      }

      mergeHeaderEntries(headers, headerEntries);

      let responseBody = body;
      const isBinaryBody = typeof responseBody !== "string";

      if (isBinaryBody) {
        if (!headers.has("Content-Type")) {
          headers.set(
            "Content-Type",
            responseBody.type ?? "application/octet-stream" // Blob may have a type
          );
        }
      } else {
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "text/html");
        }
        if (!headers.has("Content-Length")) {
          headers.set("Content-Length", new Blob([responseBody]).size.toString());
        }
      }

      if (streaming && typeof responseBody === "string") {
        responseBody = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(responseBody));
            controller.close();
          },
        });
      }

      return new Response(
        status === 204 && !responseBody ? null : responseBody, // If status is 204, body must be null
        { headers, status, statusText }
      );
    };
  };
};

export default createRoute;
