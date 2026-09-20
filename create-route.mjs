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

      const processInput = async () => {
        let mode = "INITIAL";
        let buffer = "";
        let bodyContent = "";
        let headerName = "";
        let i = 0;
        let j = 0;

        const processChunk = (chunk) => {
          buffer += chunk;
          const lines = buffer.split("\n");

          while (lines.length > 1) {
            const line = lines.shift().trim();

            switch (mode) {
              case "INITIAL":
                if (line.startsWith("HTTP/")) {
                  const [httpVersion, statusCode, ...statusTextParts] =
                    line.split(" ");
                  status = parseInt(statusCode, 10);
                  statusText = statusTextParts.join(" ");
                  mode = "HEADER";
                } else if (line !== "") {
                  mode = "BODY";
                  bodyContent += line + "\n";
                }
                break;

              case "HEADER":
                if (line === "") {
                  mode = "BODY";
                } else {
                  const colonIndex = line.indexOf(":");
                  if (colonIndex > 0) {
                    const key = line.slice(0, colonIndex).trim();
                    const value = line.slice(colonIndex + 1).trim();
                    headers.set(key, value);
                  }
                }
                break;

              case "BODY":
                bodyContent += line + "\n";
                break;
            }
          }

          buffer = lines[0] || "";
        };

        while (i < strings.length) {
          processChunk(strings[i]);

          if (j < substitutions.length) {
            const sub = substitutions[j];
            if (typeof sub === "function") {
              const result = await sub(request, context);
              if (
                result instanceof ReadableStream ||
                result instanceof Blob ||
                result instanceof ArrayBuffer ||
                result instanceof Uint8Array
              ) {
                // A substitution function can return a stream/binary value
                // just like a directly-substituted one; it must get the
                // same raw-passthrough treatment rather than being coerced
                // via .toString() (which would produce "[object ...]").
                if (!headers.has("Content-Type")) {
                  headers.set(
                    "Content-Type",
                    result.type ?? "application/octet-stream" // Blob may have a type
                  );
                }
                return result;
              } else if (result !== undefined && result !== null) {
                processChunk(result.toString());
              }
            } else if (
              sub instanceof ReadableStream ||
              sub instanceof Blob ||
              sub instanceof ArrayBuffer ||
              sub instanceof Uint8Array
            ) {
              if (!headers.has("Content-Type")) {
                headers.set(
                  "Content-Type",
                  sub.type ?? "application/octet-stream" // Blob may have a type
                );
              }
              return sub;
            } else if (sub instanceof Headers) {
              for (const [key, value] of sub) {
                headers.set(key, value);
              }
            } else if (sub !== undefined && sub !== null) {
              processChunk(sub.toString());
            }
            j++;
          }

          i++;
        }

        // Process any remaining buffer content
        if (buffer) {
          processChunk("\n");
        }

        return bodyContent.trim();
      };

      let responseBody = await processInput();

      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "text/html");
      }

      if (typeof responseBody === "string") {
        try {
          JSON.parse(responseBody);
          if (!headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
          }
        } catch {
          // Not JSON, keep existing Content-Type
        }

        if (!headers.has("Content-Length")) {
          headers.set(
            "Content-Length",
            new Blob([responseBody]).size.toString()
          );
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
      // return new Response(responseBody, { headers, status, statusText });
    };
  };
};

export default createRoute;
