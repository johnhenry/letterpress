import { createRouter } from "../create-router.mjs";
import HTTPExpression, {
  InlineParameter,
  HeaderMatch,
} from "../utility/http-expression.mjs";

import { describe, it, test } from "node:test";
import assert from "node:assert";

test("Router - Basic routing", async () => {
  const router = createRouter();
  router.endpoint`GET /``Hello, World!`;
  const request = new Request("http://example.com/");
  const response = await router(request);
  assert.equal(await response.text(), "Hello, World!");
  assert.equal(response.status, 200);
});

test("Router - URL parameters", async () => {
  const router = createRouter();
  router.endpoint`GET /user/:id``User ID: ${(_, { params }) => params.id}`;

  const request = new Request("http://example.com/user/123");
  const response = await router(request);
  assert.equal(await response.text(), "User ID: 123");
});

test("Router - 404 for unmatched routes", async () => {
  const router = createRouter();
  router.endpoint`GET /``Hello, World!`;

  const request = new Request("http://example.com/not-found");
  const response = await router(request);
  assert.equal(response.status, 404);
});

test("Router - Custom error handler", async () => {
  const router = createRouter({
    errorHandler: (error, request) =>
      new Response(`Custom Error: ${error.message}`, { status: 500 }),
  });
  router.endpoint`GET /error`(() => {
    throw new Error("Test Error");
  });

  const request = new Request("http://example.com/error");
  const response = await router(request);
  assert.equal(response.status, 500);
  assert.equal(await response.text(), "Custom Error: Test Error");
});

test("Router - Custom error handler catches rejections from async handlers", async () => {
  // Regression test: an earlier version did `return handler(...)` inside the
  // try block instead of `return await handler(...)`. Since calling an async
  // function always returns a promise (even when it throws synchronously),
  // that throw never surfaced inside the try/catch, so the rejection escaped
  // past errorHandler entirely instead of producing a 500 response.
  const router = createRouter({
    errorHandler: (error, request) =>
      new Response(`Custom Error: ${error.message}`, { status: 500 }),
  });
  router.endpoint`GET /async-error`(async () => {
    throw new Error("Async Test Error");
  });

  const request = new Request("http://example.com/async-error");
  const response = await router(request);
  assert.equal(response.status, 500);
  assert.equal(await response.text(), "Custom Error: Async Test Error");
});

test("Router - does not leak request headers into the response", async () => {
  // Regression test: the handler wrapper created by `router.endpoint` used
  // to pass the per-request context object (which includes `headers` set to
  // the *request's* Headers, so substitution functions can read them) into
  // createRoute() as its RouteInit. createRoute seeds the response
  // Headers from `init.headers`, so every request header (Cookie,
  // Authorization, arbitrary custom headers) was being echoed back as a
  // response header.
  const router = createRouter();
  router.endpoint`GET /secure``Hello, World!`;

  const request = new Request("http://example.com/secure", {
    headers: {
      Authorization: "Bearer topsecret",
      Cookie: "sessionid=abc123",
      "X-Secret-Session": "super-secret-token",
    },
  });
  const response = await router(request);
  assert.equal(response.headers.has("authorization"), false);
  assert.equal(response.headers.has("cookie"), false);
  assert.equal(response.headers.has("x-secret-session"), false);
  assert.equal(await response.text(), "Hello, World!");
});

test("Router - substitution functions can still read request context after the header fix", async () => {
  // Companion to the header-leak regression test above: fixing that bug must
  // not remove handlers' ability to read params/method/headers via context.
  const router = createRouter();
  router.endpoint`GET /user/:id``ID:${(_, { params }) =>
    params.id} Method:${(_, { method }) => method} Accept:${(
    _,
    { headers }
  ) => headers.get("Accept")}`;

  const request = new Request("http://example.com/user/42", {
    headers: { Accept: "text/plain" },
  });
  const response = await router(request);
  assert.equal(await response.text(), "ID:42 Method:GET Accept:text/plain");
});

test("Router - Multiple routes", async () => {
  const router = createRouter();
  router.endpoint`GET /``Home`;
  router.endpoint`GET /about``About`;
  router.endpoint`GET /contact``Contact`;

  const routes = ["/", "/about", "/contact"];
  for (const route of routes) {
    const request = new Request(`http://example.com${route}`);
    const response = await router(request);
    assert.equal(
      await response.text().then((s) => s.toLowerCase()),
      route === "/" ? "home" : route.slice(1)
    );
  }
});

test("Router - Method matching", async () => {
  const router = createRouter();
  router.endpoint`GET /api``GET API`;
  router.endpoint`POST /api``POST API`;

  const getRequest = new Request("http://example.com/api", { method: "GET" });
  const postRequest = new Request("http://example.com/api", { method: "POST" });

  const getResponse = await router(getRequest);
  const postResponse = await router(postRequest);

  assert.equal(await getResponse.text(), "GET API");
  assert.equal(await postResponse.text(), "POST API");
});

test("Router - Nested routes", async () => {
  const router = createRouter();
  router.endpoint`GET /api/v1/users``API v1 Users`;
  router.endpoint`GET /api/v2/users``API v2 Users`;

  const v1Request = new Request("http://example.com/api/v1/users");
  const v2Request = new Request("http://example.com/api/v2/users");

  const v1Response = await router(v1Request);
  const v2Response = await router(v2Request);

  assert.equal(await v1Response.text(), "API v1 Users");
  assert.equal(await v2Response.text(), "API v2 Users");
});

test("Router - Function handler", async () => {
  const router = createRouter();
  router.endpoint`GET /function`((request) => {
    return new Response("Function handler", { status: 200 });
  });

  const request = new Request("http://example.com/function");
  const response = await router(request);

  assert.equal(await response.text(), "Function handler");
  assert.equal(response.status, 200);
});

// Commented out tests
/*
test("Router - InlineParam", async () => {
  const router = createRouter();
  const id = InlineParam({
    name: "id",
    type: "number",
    min: 1,
    max: 1000,
  });
  router.endpoint`GET /user/${id}``User ID: ${(_, { params }) => params.id}`;

  const request = new Request("http://example.com/user/123");
  const response = await router(request);
  assert.equal(await response.text(), "User ID: 123");
});

test("Router - HeaderMatch", async () => {
  const router = createRouter();
  const jsonHeader = HeaderMatch({
    name: "Content-Type",
    value: "application/json",
  });
  router.endpoint`POST /api ${jsonHeader}`(async (request) => {
    const data = await request.json();
    return new Response(JSON.stringify({ received: data }), {
      headers: { "Content-Type": "application/json" },
    });
  });

  const request = new Request("http://example.com/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test: "data" }),
  });
  const response = await router(request);
  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.equal(await response.json(), { received: { test: "data" } });
});
*/
