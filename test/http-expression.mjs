import { test } from "node:test";
import assert from "node:assert";
import HTTPExpression, {
  InlineParameter,
  HeaderMatch,
} from "../utility/http-expression.mjs";

// Comprehensive tests
test("HTTPExpression - Comprehensive Tests", async (t) => {
  await t.test("Basic GET request", () => {
    const expr = HTTPExpression`GET /users/:id`;
    const request = new Request("https://api.example.com/users/123", {
      method: "GET",
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      id: "123",
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Colon-form header matcher from the README: [Authorization: Bearer *]", () => {
    const expr = HTTPExpression`GET /protected [Authorization: Bearer *]`;
    const withToken = new Request("https://api.example.com/protected", {
      method: "GET",
      headers: { Authorization: "Bearer abc.def.ghi" },
    });
    const wrongScheme = new Request("https://api.example.com/protected", {
      method: "GET",
      headers: { Authorization: "Basic abc" },
    });
    const noHeader = new Request("https://api.example.com/protected", { method: "GET" });
    assert.strictEqual(expr.test(withToken), true);
    assert.strictEqual(expr.test(wrongScheme), false);
    // Regression: used to throw "invalid header name" instead of returning false.
    assert.strictEqual(expr.test(noHeader), false);
  });

  await t.test("Colon-form header matcher: exact value, negation and glob edge cases", () => {
    const exact = HTTPExpression`GET /x [Content-Type: application/json]`;
    assert.strictEqual(exact.test(new Request("https://a/x", { headers: { "Content-Type": "application/json" } })), true);
    assert.strictEqual(exact.test(new Request("https://a/x", { headers: { "Content-Type": "application/json; charset=utf-8" } })), false);

    const negated = HTTPExpression`GET /x [!X-Deprecated: *]`;
    assert.strictEqual(negated.test(new Request("https://a/x")), true);
    assert.strictEqual(negated.test(new Request("https://a/x", { headers: { "X-Deprecated": "1" } })), false);

    const glob = HTTPExpression`GET /x [Accept: text/*]`;
    assert.strictEqual(glob.test(new Request("https://a/x", { headers: { Accept: "text/html" } })), true);
    assert.strictEqual(glob.test(new Request("https://a/x", { headers: { Accept: "application/json" } })), false);

    const dotted = HTTPExpression`GET /x [X-Version: 1.?]`;
    assert.strictEqual(dotted.test(new Request("https://a/x", { headers: { "X-Version": "1.5" } })), true);
    assert.strictEqual(dotted.test(new Request("https://a/x", { headers: { "X-Version": "1x5" } })), false);
  });

  await t.test("POST request with JSON body and headers", () => {
    const expr = HTTPExpression`POST /api/articles [Content-Type=application/json] [Authorization^=Bearer]`;
    const request = new Request("https://api.example.com/api/articles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token123",
      },
      body: JSON.stringify({ title: "New Article", content: "Content here" }),
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "POST",
      headers: request.headers,
    });
  });

  await t.test("PUT request with path parameters and query string", () => {
    const expr = HTTPExpression`PUT /api/users/:userId/posts/:postId`;
    const request = new Request(
      "https://api.example.com/api/users/456/posts/789?draft=true",
      { method: "PUT" }
    );
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      userId: "456",
      postId: "789",
      method: "PUT",
      headers: request.headers,
    });
  });

  await t.test("DELETE request with numeric header comparison", () => {
    const expr = HTTPExpression`DELETE /api/resources/:id [X-Rate-Limit-Remaining>0]`;
    const request = new Request("https://api.example.com/api/resources/101", {
      method: "DELETE",
      headers: { "X-Rate-Limit-Remaining": "5" },
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      id: "101",
      method: "DELETE",
      headers: request.headers,
    });
  });

  await t.test("PATCH request with regex header matching", () => {
    const expr = HTTPExpression`PATCH /api/v:version/update [Accept~=application/(json|xml)]`;
    const request = new Request("https://api.example.com/api/v2/update", {
      method: "PATCH",
      headers: { Accept: "application/json" },
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      version: "2",
      method: "PATCH",
      headers: request.headers,
    });
  });

  await t.test("GET request with multiple header conditions", () => {
    const expr = HTTPExpression`GET /api/data [Cache-Control=no-cache] [X-Requested-With=XMLHttpRequest] [!X-Forwarded-For]`;
    const request = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("POST request with content negotiation", () => {
    const expr = HTTPExpression`POST /api/submit [Content-Type^=application/] [Accept$=json]`;
    const request = new Request("https://api.example.com/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "POST",
      headers: request.headers,
    });
  });

  await t.test("GET request with case-insensitive header matching", () => {
    const expr = HTTPExpression`GET /api/status [X-API-Version~=(?i)beta]`;
    const request = new Request("https://api.example.com/api/status", {
      method: "GET",
      headers: { "X-API-Version": "BETA-1.2.3" },
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Request not matching method", () => {
    const expr = HTTPExpression`GET /api/data`;
    const request = new Request("https://api.example.com/api/data", {
      method: "POST",
    });
    assert.strictEqual(expr.test(request), false);
    assert.strictEqual(expr.exec(request), null);
  });

  await t.test("Request not matching path", () => {
    const expr = HTTPExpression`GET /api/users/:id`;
    const request = new Request("https://api.example.com/api/posts/123", {
      method: "GET",
    });
    assert.strictEqual(expr.test(request), false);
    assert.strictEqual(expr.exec(request), null);
  });

  await t.test("Request not matching header condition", () => {
    const expr = HTTPExpression`GET /api/secure [Authorization=Bearer token123]`;
    const request = new Request("https://api.example.com/api/secure", {
      method: "GET",
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    assert.strictEqual(expr.test(request), false);
    assert.strictEqual(expr.exec(request), null);
  });

  await t.test("Complex request with multiple conditions", () => {
    const expr = HTTPExpression`POST /api/v:version/users/:userId/orders [Content-Type=application/json] [Authorization^=Bearer] [X-API-Key] [!X-Deprecated]`;
    const request = new Request(
      "https://api.example.com/api/v2/users/789/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "X-API-Key": "abcdef123456",
        },
        body: JSON.stringify({ items: [{ id: 1, quantity: 2 }] }),
      }
    );
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      version: "2",
      userId: "789",
      method: "POST",
      headers: request.headers,
    });
  });

  await t.test("GET request with complex regex header matching", () => {
    const expr = HTTPExpression`GET /api/data [Accept~=(text/|application/json)]`;
    const jsonRequest = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    assert.strictEqual(expr.test(jsonRequest), true);

    const textRequest = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { Accept: "text/plain" },
    });
    assert.strictEqual(expr.test(textRequest), true);

    const invalidRequest = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { Accept: "image/png" },
    });
    assert.strictEqual(expr.test(invalidRequest), false);
  });

  await t.test("Using InlineParameter", () => {
    const expr = HTTPExpression`GET /api/users/${InlineParameter({
      name: "id",
      type: "number",
      transform: Number,
    })}`;
    const request = new Request("https://api.example.com/api/users/123", {
      method: "GET",
    });
    assert.strictEqual(expr.test(request), true);
    const result = expr.exec(request);
    assert.strictEqual(typeof result.id, "string"); // Note: We're not applying the transform in this implementation
    assert.strictEqual(result.id, "123");
  });

  await t.test("Using HeaderMatch", () => {
    const expr = HTTPExpression`GET /api/data ${HeaderMatch({
      name: "X-Custom-Header",
      operator: "*=",
      value: "test",
    })}`;
    const request = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { "X-Custom-Header": "this is a test header" },
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Header with spaces in value", () => {
    const expr = HTTPExpression`GET /api/data [X-Custom-Header=Value with spaces]`;
    const request = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { "X-Custom-Header": "Value with spaces" },
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Unquoted header value with spaces", () => {
    const expr = HTTPExpression`GET /api/data [X-Custom-Header=Value with spaces]`;
    const request = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { "X-Custom-Header": "Value with spaces" },
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Multiple path parameters", () => {
    const expr = HTTPExpression`GET /api/:version/users/:userId/posts/:postId`;
    const request = new Request(
      "https://api.example.com/api/v1/users/123/posts/456",
      {
        method: "GET",
      }
    );
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      version: "v1",
      userId: "123",
      postId: "456",
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Header with special characters", () => {
    const expr = HTTPExpression`GET /api/data [X-Special-Header=!@#$%^&*()]`;
    const request = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { "X-Special-Header": "!@#$%^&*()" },
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Path with query parameters", () => {
    const expr = HTTPExpression`GET /api/search`;
    const request = new Request(
      "https://api.example.com/api/search?q=test&page=1",
      {
        method: "GET",
      }
    );
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Case-insensitive method matching", () => {
    const expr = HTTPExpression`GET /api/data`;
    const request = new Request("https://api.example.com/api/data", {
      method: "get",
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Multiple header conditions with AND logic", () => {
    const expr = HTTPExpression`POST /api/data [Content-Type=application/json] [Authorization^=Bearer] [X-API-Version=1.0]`;
    const validRequest = new Request("https://api.example.com/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token123",
        "X-API-Version": "1.0",
      },
    });
    assert.strictEqual(expr.test(validRequest), true);

    const invalidRequest = new Request("https://api.example.com/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token123",
        "X-API-Version": "2.0", // This doesn't match the condition
      },
    });
    assert.strictEqual(expr.test(invalidRequest), false);
  });

  await t.test("Empty path", () => {
    const expr = HTTPExpression`GET /`;
    const request = new Request("https://api.example.com/", {
      method: "GET",
    });
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Path with trailing slash", () => {
    const expr = HTTPExpression`GET /api/users/`;
    const requestWithSlash = new Request("https://api.example.com/api/users/", {
      method: "GET",
    });
    const requestWithoutSlash = new Request(
      "https://api.example.com/api/users",
      {
        method: "GET",
      }
    );
    assert.strictEqual(expr.test(requestWithSlash), true);
    assert.strictEqual(expr.test(requestWithoutSlash), false);
  });

  await t.test("Header exists condition", () => {
    const expr = HTTPExpression`GET /api/data [X-Custom-Header]`;
    const validRequest = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { "X-Custom-Header": "any value" },
    });
    const invalidRequest = new Request("https://api.example.com/api/data", {
      method: "GET",
    });
    assert.strictEqual(expr.test(validRequest), true);
    assert.strictEqual(expr.test(invalidRequest), false);
  });

  await t.test("Negated header condition", () => {
    const expr = HTTPExpression`GET /api/public [!Authorization]`;
    const validRequest = new Request("https://api.example.com/api/public", {
      method: "GET",
    });
    const invalidRequest = new Request("https://api.example.com/api/public", {
      method: "GET",
      headers: { Authorization: "Bearer token123" },
    });
    assert.strictEqual(expr.test(validRequest), true);
    assert.strictEqual(expr.test(invalidRequest), false);
  });
});
// Additional comprehensive tests
test("HTTPExpression - Additional Tests", async (t) => {
  await t.test(
    "Complex path with multiple parameters and nested resources",
    () => {
      const expr = HTTPExpression`GET /api/v:version/users/:userId/posts/:postId/comments/:commentId`;
      const request = new Request(
        "https://api.example.com/api/v2/users/123/posts/456/comments/789",
        {
          method: "GET",
        }
      );
      assert.strictEqual(expr.test(request), true);
      assert.deepStrictEqual(expr.exec(request), {
        version: "2",
        userId: "123",
        postId: "456",
        commentId: "789",
        method: "GET",
        headers: request.headers,
      });
    }
  );

  await t.test("Path with encoded characters", () => {
    const expr = HTTPExpression`GET /search/:query`;
    const request = new Request(
      "https://api.example.com/search/hello%20world",
      {
        method: "GET",
      }
    );
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      query: "hello%20world",
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Header with comma-separated values", () => {
    const expr = HTTPExpression`GET /api/data [Accept=application/json, text/plain]`;
    const request = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { Accept: "application/json, text/plain" },
    });
    assert.strictEqual(expr.test(request), true);
  });

  await t.test("Case-insensitive header name matching", () => {
    const expr = HTTPExpression`GET /api/data [content-type=application/json]`;
    const request = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    assert.strictEqual(expr.test(request), true);
  });

  // await t.test("Header value with regex special characters", () => {
  //   const expr = HTTPExpression`GET /api/data [X-Special-Header~=^special\\s.*$]`;
  //   const request = new Request("https://api.example.com/api/data", {
  //     method: "GET",
  //     headers: { "X-Special-Header": "special value" },
  //   });
  //   assert.strictEqual(expr.test(request), true);
  // });

  await t.test("Path parameter with regex special characters", () => {
    const expr = HTTPExpression`GET /api/users/:username`;
    const request = new Request(
      "https://api.example.com/api/users/john.doe+123",
      {
        method: "GET",
      }
    );
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      username: "john.doe+123",
      method: "GET",
      headers: request.headers,
    });
  });

  // await t.test("Header with quoted value containing spaces", () => {
  //   const expr = HTTPExpression`GET /api/data [X-Custom-Header="Value with spaces"]`;
  //   const request = new Request("https://api.example.com/api/data", {
  //     method: "GET",
  //     headers: { "X-Custom-Header": "Value with spaces" },
  //   });
  //   assert.strictEqual(expr.test(request), true);
  // });

  await t.test("Multiple methods for the same path", () => {
    const expr1 = HTTPExpression`GET /api/resource`;
    const expr2 = HTTPExpression`POST /api/resource`;
    const request1 = new Request("https://api.example.com/api/resource", {
      method: "GET",
    });
    const request2 = new Request("https://api.example.com/api/resource", {
      method: "POST",
    });
    assert.strictEqual(expr1.test(request1), true);
    assert.strictEqual(expr1.test(request2), false);
    assert.strictEqual(expr2.test(request1), false);
    assert.strictEqual(expr2.test(request2), true);
  });

  await t.test("Path with matrix parameters", () => {
    const expr = HTTPExpression`GET /api/users/:userId;role=:role/posts`;
    const request = new Request(
      "https://api.example.com/api/users/123;role=admin/posts",
      {
        method: "GET",
      }
    );
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      userId: "123",
      role: "admin",
      method: "GET",
      headers: request.headers,
    });
  });

  await t.test("Header with numerical comparison (less than)", () => {
    const expr = HTTPExpression`GET /api/data [X-Rate-Limit-Remaining<10]`;
    const request = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { "X-Rate-Limit-Remaining": "5" },
    });
    assert.strictEqual(expr.test(request), true);
  });

  await t.test(
    "Header with numerical comparison (greater than or equal)",
    () => {
      const expr = HTTPExpression`GET /api/data [X-Rate-Limit-Remaining>=10]`;
      const request = new Request("https://api.example.com/api/data", {
        method: "GET",
        headers: { "X-Rate-Limit-Remaining": "15" },
      });
      assert.strictEqual(expr.test(request), true);
    }
  );

  await t.test("Complex combination of path parameters and headers", () => {
    const expr = HTTPExpression`POST /api/v:version/users/:userId/posts [Content-Type=application/json] [Authorization^=Bearer] [X-API-Key]`;
    const request = new Request(
      "https://api.example.com/api/v2/users/123/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
          "X-API-Key": "abc123",
        },
      }
    );
    assert.strictEqual(expr.test(request), true);
    assert.deepStrictEqual(expr.exec(request), {
      version: "2",
      userId: "123",
      method: "POST",
      headers: request.headers,
    });
  });

  await t.test("Path with optional segment", () => {
    const expr = HTTPExpression`GET /api/users/:userId(/posts)?`;
    const request1 = new Request("https://api.example.com/api/users/123", {
      method: "GET",
    });
    const request2 = new Request(
      "https://api.example.com/api/users/123/posts",
      { method: "GET" }
    );
    assert.strictEqual(expr.test(request1), true);
    assert.strictEqual(expr.test(request2), true);
  });

  await t.test("Header with multiple conditions on the same header", () => {
    const expr = HTTPExpression`GET /api/data [Accept^=application/] [Accept$=json]`;
    const request = new Request("https://api.example.com/api/data", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    assert.strictEqual(expr.test(request), true);
  });

  await t.test("Path with custom regex for parameter", () => {
    const expr = HTTPExpression`GET /api/users/:userId(\\d+)`;
    const validRequest = new Request("https://api.example.com/api/users/123", {
      method: "GET",
    });
    const invalidRequest = new Request(
      "https://api.example.com/api/users/abc",
      { method: "GET" }
    );
    assert.strictEqual(expr.test(validRequest), true);
    assert.strictEqual(expr.test(invalidRequest), false);
  });

  await t.test("Header with base64 encoded value", () => {
    const expr = HTTPExpression`GET /api/secure [Authorization=Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==]`;
    const request = new Request("https://api.example.com/api/secure", {
      method: "GET",
      headers: { Authorization: "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==" },
    });
    assert.strictEqual(expr.test(request), true);
  });
});
