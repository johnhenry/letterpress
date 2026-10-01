import { parseHttpText } from "./utility/parse-http-text.mjs";

const DEFAULT_REQUEST = () => new Request("http://.");

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

      // Same rule tag-request.mjs/tag-response.mjs use: the first
      // occurrence of a header name overwrites whatever was already set
      // (e.g. from `init`), a second-or-later occurrence of the *same
      // name* accumulates instead of overwriting it. Applied immediately
      // per header line (via onHeaderLine below), not batched until the
      // whole parse finishes -- a *later* function substitution's
      // context.setHeader() call must still be able to overwrite an
      // earlier template header line, exactly like the original
      // chunk-by-chunk implementation did.
      const seenHeaderNames = new Set();
      const applyHeaderLine = (name, value) => {
        const key = name.toLowerCase();
        if (seenHeaderNames.has(key)) {
          headers.append(name, value);
        } else {
          headers.set(name, value);
          seenHeaderNames.add(key);
        }
      };

      const { startLine, body } = await parseHttpText(strings, substitutions, {
        isStartLine: (line) => line.startsWith("HTTP/"),
        trimBodyLines: true,
        onHeaderLine: applyHeaderLine,
        // Function-valued substitutions are create-route's one feature
        // the shared parser doesn't (and shouldn't) know about on its
        // own: a substitution can run arbitrary async work and mutate
        // `context` (headers/status) as a side effect, in addition to
        // contributing a value to the template. Resolved inline, at the
        // exact point the scan reaches it, so its side effects land in
        // the same left-to-right order as the template text itself.
        resolveSubstitution: (sub) =>
          typeof sub === "function" ? sub(request, context) : sub,
      });

      if (startLine !== null) {
        const [, statusCodeText, ...statusTextParts] = startLine.split(" ");
        const parsedStatus = parseInt(statusCodeText, 10);
        if (!Number.isNaN(parsedStatus)) {
          status = parsedStatus;
          statusText = statusTextParts.join(" ");
        }
      }

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
