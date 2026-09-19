import { createLeRoute } from "../create-leroute.mjs";

import { describe, it } from "node:test";
import assert from "node:assert";

describe("createLeRoute", () => {
  it("should create a basic route", async () => {
    const route = createLeRoute()`Hello, World!`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(await response.text(), "Hello, World!");
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get("Content-Type"), "text/html");
  });

  it("should handle function substitutions", async () => {
    const route = createLeRoute()`The number is: ${() => 42}`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(await response.text(), "The number is: 42");
  });

  it("should handle async function substitutions", async () => {
    const route = createLeRoute()`The result is: ${async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "async";
    }}`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(await response.text(), "The result is: async");
  });

  it("should allow setting custom headers", async () => {
    const route = createLeRoute({
      headers: { "X-Custom-Header": "Test" },
    })`Custom header test`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(response.headers.get("X-Custom-Header"), "Test");
  });

  it("should allow setting custom status", async () => {
    const route = createLeRoute({
      status: 404,
      statusText: "Not Found",
    })`404 Not Found`;
    const response = await route(new Request("https://example.com"));
    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.statusText, "Not Found");
  });

  it("should handle streaming responses", async () => {
    const route = createLeRoute({ streaming: true })`
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
