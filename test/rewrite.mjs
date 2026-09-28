import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createRewriter } from "../rewrite.mjs";

// Ported from leroute's test/rewrite.mjs. createRewriter existed in
// leroute (the package letterpress was renamed from) but was dropped
// during the leroute -> @johnhenry/letterpress rename; this closes that
// migration gap -- see rewrite.mjs's top-of-file comment and
// CHANGELOG.md. Test cases are unchanged from the leroute original.

describe("Rewrite", () => {
  test("should rewrite request path with regex capture groups", () => {
    const rewriter = createRewriter([
      {
        match: { path: /^\/api\/v1\/(.*)/ },
        action: { rewritePath: "/api/v2/$1" },
      },
    ]);

    const req = new Request("http://localhost/api/v1/users");
    const rewritten = rewriter.rewriteRequest(req);
    const url = new URL(rewritten.url);
    assert.equal(url.pathname, "/api/v2/users");
  });

  test("should set and remove request headers", () => {
    const rewriter = createRewriter([
      {
        action: {
          setHeader: { "x-custom": "hello" },
          removeHeader: ["x-remove-me"],
        },
      },
    ]);

    const req = new Request("http://localhost/test", {
      headers: { "x-remove-me": "gone" },
    });
    const rewritten = rewriter.rewriteRequest(req);
    assert.equal(rewritten.headers.get("x-custom"), "hello");
    assert.equal(rewritten.headers.get("x-remove-me"), null);
  });

  test("should set and remove response headers", () => {
    const rewriter = createRewriter([
      {
        action: {
          setHeader: { "x-powered-by": "letterpress" },
          removeHeader: ["server"],
        },
      },
    ]);

    const res = new Response("ok", {
      headers: { server: "old" },
    });
    const rewritten = rewriter.rewriteResponse(res);
    assert.equal(rewritten.headers.get("x-powered-by"), "letterpress");
    assert.equal(rewritten.headers.get("server"), null);
  });

  test("should set response status", () => {
    const rewriter = createRewriter([
      {
        match: { path: "/teapot" },
        action: { setStatus: 418 },
      },
    ]);

    const req = new Request("http://localhost/teapot");
    const res = new Response("ok", { status: 200 });
    const rewritten = rewriter.rewriteResponse(res, req);
    assert.equal(rewritten.status, 418);
  });

  test("response rules only apply when request matches (bug fix)", () => {
    const rewriter = createRewriter([
      {
        match: { path: "/admin" },
        action: { setHeader: { "x-admin": "true" } },
      },
    ]);

    const req = new Request("http://localhost/public");
    const res = new Response("ok");
    const rewritten = rewriter.rewriteResponse(res, req);
    // Rule should NOT apply because /public doesn't match /admin
    assert.equal(rewritten.headers.get("x-admin"), null);
    // Response should be the same object (unchanged)
    assert.equal(rewritten, res);
  });

  test("global rules (no match clause) apply to all responses", () => {
    const rewriter = createRewriter([
      {
        action: { setHeader: { "x-global": "yes" } },
      },
    ]);

    const req = new Request("http://localhost/anything");
    const res = new Response("ok");
    const rewritten = rewriter.rewriteResponse(res, req);
    assert.equal(rewritten.headers.get("x-global"), "yes");
  });

  test("middleware wraps handler correctly", async () => {
    const rewriter = createRewriter([
      {
        match: { path: /^\/old\/(.*)/ },
        action: {
          rewritePath: "/new/$1",
          setHeader: { "x-rewritten": "true" },
        },
      },
    ]);

    // A handler that echoes back the pathname it received
    const handler = async (request) => {
      const url = new URL(request.url);
      return new Response(url.pathname, { status: 200 });
    };

    const wrapped = rewriter.middleware(handler);
    const req = new Request("http://localhost/old/stuff");
    const res = await wrapped(req, {});

    // Handler should have received the rewritten path
    const body = await res.text();
    assert.equal(body, "/new/stuff");
    // Response should have the rewritten header
    assert.equal(res.headers.get("x-rewritten"), "true");
  });

  test("addRule with /regex/ string conversion", () => {
    const rewriter = createRewriter();
    rewriter.addRule({
      match: { path: "/^\\/api\\/(.*)/" },
      action: { rewritePath: "/v2/$1" },
    });

    const rules = rewriter.getRules();
    assert.equal(rules.length, 1);
    assert.equal(rules[0].match.path, "^\\/api\\/(.*)");
  });

  test("addRule with invalid regex throws descriptive error", () => {
    const rewriter = createRewriter();
    assert.throws(
      () => {
        rewriter.addRule({
          match: { path: "/[invalid/" },
          action: {},
        });
      },
      (err) => {
        assert.ok(err.message.includes("Invalid regex pattern"));
        return true;
      }
    );
  });

  test("removeRule / getRules CRUD", () => {
    const rewriter = createRewriter();
    rewriter.addRule({ match: { path: "/a" }, action: {} });
    rewriter.addRule({ match: { path: "/b" }, action: {} });
    rewriter.addRule({ match: { path: "/c" }, action: {} });

    assert.equal(rewriter.getRules().length, 3);

    rewriter.removeRule(1);
    const rules = rewriter.getRules();
    assert.equal(rules.length, 2);
    assert.equal(rules[0].match.path, "/a");
    assert.equal(rules[1].match.path, "/c");
  });

  test("removeRule ignores out-of-bounds index", () => {
    const rewriter = createRewriter();
    rewriter.addRule({ match: { path: "/a" }, action: {} });
    rewriter.removeRule(5);
    rewriter.removeRule(-1);
    assert.equal(rewriter.getRules().length, 1);
  });

  test("method matching", () => {
    const rewriter = createRewriter([
      {
        match: { method: "POST" },
        action: { setHeader: { "x-method": "post" } },
      },
    ]);

    const getReq = new Request("http://localhost/test", { method: "GET" });
    const postReq = new Request("http://localhost/test", { method: "POST" });

    const getResult = rewriter.rewriteRequest(getReq);
    const postResult = rewriter.rewriteRequest(postReq);

    assert.equal(getResult.headers.get("x-method"), null);
    assert.equal(postResult.headers.get("x-method"), "post");
  });
});
