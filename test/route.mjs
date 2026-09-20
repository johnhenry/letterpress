import { createRoute } from "../create-route.mjs";

import { describe, it } from "node:test";
import assert from "node:assert";

describe("createRoute", () => {
  it("should create a basic route", async () => {
    const route = createRoute()`Hello, World!`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(await response.text(), "Hello, World!");
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get("Content-Type"), "text/html");
  });

  it("should handle function substitutions", async () => {
    const route = createRoute()`The number is: ${() => 42}`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(await response.text(), "The number is: 42");
  });

  it("should handle async function substitutions", async () => {
    const route = createRoute()`The result is: ${async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "async";
    }}`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(await response.text(), "The result is: async");
  });

  it("should allow setting custom headers", async () => {
    const route = createRoute({
      headers: { "X-Custom-Header": "Test" },
    })`Custom header test`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(response.headers.get("X-Custom-Header"), "Test");
  });

  it("should allow setting custom status", async () => {
    const route = createRoute({
      status: 404,
      statusText: "Not Found",
    })`404 Not Found`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.statusText, "Not Found");
  });

  it("should treat a null/undefined substitution as empty rather than throwing", async () => {
    // Regression test: `sub.toString()` was called unconditionally on
    // directly-substituted values, so `${null}` or `${undefined}` in a
    // template threw "Cannot read properties of null/undefined (reading
    // 'toString')" instead of behaving like ordinary JS template literals.
    const nullRoute = createRoute()`Before ${null} After`;
    const nullResponse = await nullRoute(new Request("https://example.com"));
    assert.strictEqual(await nullResponse.text(), "Before  After");

    const undefinedRoute = createRoute()`Before ${undefined} After`;
    const undefinedResponse = await undefinedRoute(
      new Request("https://example.com")
    );
    assert.strictEqual(await undefinedResponse.text(), "Before  After");
  });

  it("should treat a substitution function returning null the same as returning undefined", async () => {
    // Regression test: a function substitution's `undefined` result is
    // explicitly skipped, but a `null` result hit the same `.toString()`
    // call and threw.
    const route = createRoute()`Before ${() => null} After`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(await response.text(), "Before  After");
  });

  it("should pass through a stream/binary value returned by a substitution function", async () => {
    // Regression test: a directly-substituted ReadableStream/Blob/
    // ArrayBuffer/Uint8Array is returned as the raw response body, but a
    // substitution *function* that returned one of those values was
    // coerced with `.toString()`, producing the literal text
    // "[object ReadableStream]" instead of the stream's actual content.
    const route = createRoute()`${() =>
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("STREAMED"));
          controller.close();
        },
      })}`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(await response.text(), "STREAMED");
  });

  it("should handle streaming responses", async () => {
    const route = createRoute({ streaming: true })`
      ${async (_, { response }) => {
        response.headers.set("X-Streaming", "True");
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "Part 1";
      }}
      ${async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "Part 2";
      }}
    `;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(response.headers.get("X-Streaming"), "True");
    assert.strictEqual(response.headers.get("Content-Length"), "13");

    const reader = response.body.getReader();
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }
    assert.match(result, /Part 1/);
    assert.match(result, /Part 2/);
  });
});
