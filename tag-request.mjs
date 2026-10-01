import { parseHttpText } from "./utility/parse-http-text.mjs";

const inferBodyContentType = (body) => {
  if (body instanceof ReadableStream) return "application/octet-stream";
  if (body instanceof Blob) return body.type || "application/octet-stream";
  if (body instanceof URLSearchParams)
    return "application/x-www-form-urlencoded";
  if (body instanceof ArrayBuffer || body instanceof Uint8Array)
    return "application/octet-stream";
  return null; // FormData sets its own; plain strings get no guessed type
};

const mergeHeaderEntries = (baseHeaders, headerEntries) => {
  const seen = new Set();
  for (const { name, value } of headerEntries) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      baseHeaders.append(name, value);
    } else {
      baseHeaders.set(name, value);
      seen.add(key);
    }
  }
  return baseHeaders;
};

const PASSTHROUGH_REQUEST_INIT_KEYS = [
  "redirect",
  "credentials",
  "mode",
  "referrer",
  "referrerPolicy",
  "signal",
];

export const tagRequest = (defaults = {}) => {
  const baseHeaders = new Headers(defaults.headers);
  if (defaults.host !== undefined) {
    if (baseHeaders.has("host")) {
      throw new TypeError(
        "tagRequest: both the 'host' sugar key and headers.host/Host were given in defaults -- remove one"
      );
    }
    baseHeaders.set("host", defaults.host);
  }

  return async function (strings, ...substitutions) {
    const { startLine, headerEntries, body } = await parseHttpText(
      strings,
      substitutions
    );
    const [method, url, httpVersion] = startLine.split(" ");
    if (!method || !url || !httpVersion) {
      throw new TypeError(
        `tagRequest: template must start with a request line ("METHOD /path HTTP/1.1"), got: ${JSON.stringify(
          startLine
        )}`
      );
    }

    const baseUrl = defaults.baseUrl || "http://localhost";
    const fullUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? new URL(url)
        : new URL(url.startsWith("/") ? url : `/${url}`, baseUrl);

    const headers = mergeHeaderEntries(new Headers(baseHeaders), headerEntries);

    const requestInit = { method, headers };
    for (const key of PASSTHROUGH_REQUEST_INIT_KEYS) {
      if (defaults[key] !== undefined) requestInit[key] = defaults[key];
    }

    const isBinaryBody = typeof body !== "string";
    if (isBinaryBody) {
      requestInit.body = body;
      if (body instanceof ReadableStream) requestInit.duplex = "half";
      if (!headers.has("Content-Type")) {
        const contentType = inferBodyContentType(body);
        if (contentType) headers.set("Content-Type", contentType);
      }
    } else if (body) {
      requestInit.body = body;
    }

    if (requestInit.body && !headers.has("Content-Length")) {
      const size =
        requestInit.body instanceof Blob
          ? requestInit.body.size
          : typeof requestInit.body === "string"
          ? new Blob([requestInit.body]).size
          : null;
      if (size !== null) headers.set("Content-Length", size.toString());
    }

    return new Request(fullUrl, requestInit);
  };
};

export default tagRequest;
