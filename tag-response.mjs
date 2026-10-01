import { parseHttpText } from "./utility/parse-http-text.mjs";

const inferBodyContentType = (body) => {
  if (body instanceof ReadableStream) return "application/octet-stream";
  if (body instanceof Blob) return body.type || "application/octet-stream";
  if (body instanceof URLSearchParams)
    return "application/x-www-form-urlencoded";
  if (body instanceof ArrayBuffer || body instanceof Uint8Array)
    return "application/octet-stream";
  return null;
};

const mergeHeaderEntries = (headerEntries) => {
  const headers = new Headers();
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
  return headers;
};

export const tagResponse = async function (strings, ...substitutions) {
  const { startLine, headerEntries, body } = await parseHttpText(
    strings,
    substitutions
  );
  const [httpVersion, statusCodeText, ...statusTextParts] =
    startLine.split(" ");
  const status = parseInt(statusCodeText, 10);
  if (!httpVersion?.startsWith("HTTP/") || Number.isNaN(status)) {
    throw new TypeError(
      `tagResponse: template must start with a status line ("HTTP/1.1 200 OK"), got: ${JSON.stringify(
        startLine
      )}`
    );
  }
  const statusText = statusTextParts.join(" ");

  const headers = mergeHeaderEntries(headerEntries);

  const isBinaryBody = typeof body !== "string";
  let responseBody = body;
  if (isBinaryBody) {
    if (!headers.has("Content-Type")) {
      const contentType = inferBodyContentType(body);
      if (contentType) headers.set("Content-Type", contentType);
    }
  }

  if (responseBody && !headers.has("Content-Length")) {
    const size =
      responseBody instanceof Blob
        ? responseBody.size
        : typeof responseBody === "string"
        ? new Blob([responseBody]).size
        : null;
    if (size !== null) headers.set("Content-Length", size.toString());
  }

  return new Response(status === 204 && !responseBody ? null : responseBody, {
    status,
    statusText,
    headers,
  });
};

export default tagResponse;
