import { test } from "node:test";
import { strict as assert } from "node:assert";
import { tagRequest, tagResponse } from "../index.mjs";

const createReadableStream = (data) =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  });

await test("tagRequest", async (t) => {
  await t.test("basic request, Host header from template", async () => {
    const request = await tagRequest()`POST /users HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

name=A+B&email=a%40b.com`;
    assert.equal(request.method, "POST");
    // Host: example.com in the template sets the Host *header* -- it does
    // not change which baseUrl a relative "/users" path resolves against
    // (that's the separate `baseUrl` option, matching createRequest).
    assert.equal(request.url, "http://localhost/users");
    assert.equal(request.headers.get("host"), "example.com");
    assert.equal(
      request.headers.get("content-type"),
      "application/x-www-form-urlencoded"
    );
    assert.equal(await request.text(), "name=A+B&email=a%40b.com");
    assert.equal(request.headers.get("content-length"), "24");
  });

  await t.test("host sugar key", async () => {
    const request = await tagRequest({ host: "example.com" })`GET /path HTTP/1.1
Accept: application/json`;
    assert.equal(request.headers.get("host"), "example.com");
    assert.equal(request.headers.get("accept"), "application/json");
  });

  await t.test("host sugar key conflicts with explicit headers.host -- throws", () => {
    assert.throws(
      () => tagRequest({ host: "a", headers: { Host: "b" } }),
      TypeError
    );
  });

  await t.test(
    "defaults.headers is a fallback, template headers win per-key",
    async () => {
      const request = await tagRequest({
        headers: { "X-Default": "from-defaults", "Content-Type": "text/x-default" },
      })`POST /x HTTP/1.1
Content-Type: text/plain

body`;
      assert.equal(request.headers.get("x-default"), "from-defaults");
      assert.equal(request.headers.get("content-type"), "text/plain");
    }
  );

  await t.test("missing request line throws", async () => {
    await assert.rejects(
      () => tagRequest()`Content-Type: text/plain

oops`,
      TypeError
    );
  });

  await t.test(
    "a substituted header value containing a colon is not truncated",
    async () => {
      const request = await tagRequest()`POST /x HTTP/1.1
X-Note: ${"value: with: colons: inside"}
Content-Type: text/plain

body`;
      assert.equal(
        request.headers.get("x-note"),
        "value: with: colons: inside"
      );
      assert.equal(await request.text(), "body");
    }
  );

  await t.test(
    "a substituted value cannot inject a new header or end headers early",
    async () => {
      // If the parser re-scanned this substitution's text for structure,
      // it would register a second "injected" header and/or end the
      // header section early. The platform's Headers validation rejects
      // a raw embedded newline in a header value outright, which is the
      // correct outcome -- it proves the value was handed to Headers.set
      // as one literal string, not re-tokenized into separate lines.
      await assert.rejects(
        () =>
          tagRequest()`POST /x HTTP/1.1
X-Note: ${"line1\ninjected: value"}
Content-Type: text/plain

body`,
        TypeError
      );
    }
  );

  await t.test("repeated header name accumulates (not last-wins)", async () => {
    const request = await tagRequest()`POST /x HTTP/1.1
X-Tag: a
X-Tag: b
Content-Type: text/plain

body`;
    // Headers folds repeated non-Set-Cookie values with ", " on .get() --
    // the point here is both survive, rather than "b" silently winning.
    assert.equal(request.headers.get("x-tag"), "a, b");
  });

  await t.test("Headers object substitution merges directly", async () => {
    const extra = new Headers({ "X-From-Headers-Object": "yes" });
    const request = await tagRequest()`POST /x HTTP/1.1
${extra}
Content-Type: text/plain

body`;
    assert.equal(request.headers.get("x-from-headers-object"), "yes");
  });

  await t.test("binary body passthrough (Uint8Array)", async () => {
    const bin = new Uint8Array([1, 2, 3]);
    const request = await tagRequest()`POST /up HTTP/1.1

${bin}`;
    const buf = await request.arrayBuffer();
    assert.deepEqual([...new Uint8Array(buf)], [1, 2, 3]);
    assert.equal(request.headers.get("content-type"), "application/octet-stream");
  });

  await t.test("binary body passthrough (ReadableStream)", async () => {
    const request = await tagRequest()`POST /up HTTP/1.1

${createReadableStream("streamed")}`;
    assert.equal(await request.text(), "streamed");
  });

  await t.test(
    "binary body substitution mixed with other body content throws",
    async () => {
      const bin = new Uint8Array([1, 2, 3]);
      await assert.rejects(
        () => tagRequest()`POST /up HTTP/1.1

prefix ${bin}`,
        TypeError
      );
      await assert.rejects(
        () => tagRequest()`POST /up HTTP/1.1

${bin}${new Uint8Array([9])}`,
        TypeError
      );
    }
  );

  await t.test("Content-Length auto-filled only when absent", async () => {
    const auto = await tagRequest()`POST /x HTTP/1.1
Content-Type: text/plain

hello`;
    assert.equal(auto.headers.get("content-length"), "5");

    const explicit = await tagRequest()`POST /x HTTP/1.1
Content-Type: text/plain
Content-Length: 999

hello`;
    assert.equal(
      explicit.headers.get("content-length"),
      "999",
      "an explicitly-declared Content-Length is never overwritten, even if wrong"
    );
  });

  await t.test("relative vs absolute URLs, baseUrl option", async () => {
    const relative = await tagRequest({ baseUrl: "https://api.example.com" })`GET /search?q=1 HTTP/1.1`;
    assert.equal(relative.url, "https://api.example.com/search?q=1");

    const absolute = await tagRequest()`DELETE https://api.example.com/users/1 HTTP/1.1`;
    assert.equal(absolute.url, "https://api.example.com/users/1");
    assert.equal(absolute.method, "DELETE");
  });
});

await test("tagResponse", async (t) => {
  await t.test("basic response", async () => {
    const response = await tagResponse`HTTP/1.1 201 Created
Content-Type: application/json
Location: http://example.com/users/123

{"id":123}`;
    assert.equal(response.status, 201);
    assert.equal(response.statusText, "Created");
    assert.equal(response.headers.get("location"), "http://example.com/users/123");
    assert.deepEqual(await response.json(), { id: 123 });
  });

  await t.test("missing status line throws", async () => {
    await assert.rejects(
      () => tagResponse`Content-Type: text/plain

oops`,
      TypeError
    );
  });

  await t.test("repeated Set-Cookie accumulates, not last-wins", async () => {
    const response = await tagResponse`HTTP/1.1 200 OK
Set-Cookie: a=1
Set-Cookie: b=2
Content-Type: text/plain

hello`;
    const cookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [...response.headers.entries()]
          .filter(([k]) => k === "set-cookie")
          .map(([, v]) => v);
    assert.deepEqual(cookies, ["a=1", "b=2"]);
  });

  await t.test("204 has a null body", async () => {
    const response = await tagResponse`HTTP/1.1 204 No Content
`;
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
  });

  await t.test("binary body passthrough (Blob)", async () => {
    const response = await tagResponse`HTTP/1.1 200 OK

${new Blob(["hello blob"], { type: "text/plain" })}`;
    assert.equal(response.headers.get("content-type"), "text/plain");
    assert.equal(await response.text(), "hello blob");
  });

  await t.test("Content-Length auto-filled only when absent", async () => {
    const auto = await tagResponse`HTTP/1.1 200 OK

hello`;
    assert.equal(auto.headers.get("content-length"), "5");
  });
});
