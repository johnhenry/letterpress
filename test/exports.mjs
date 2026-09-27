import { test } from "node:test";
import assert from "node:assert";

// Regression tests for https://github.com/johnhenry/letterpress/issues/6:
// the main barrel used to re-export `createFSRouter` from `fs-router.mjs`,
// which imports `node:fs`, `node:path`, and `theres-waldo` (which itself
// uses `node:url`) at module top level. That broke browser bundlers (e.g.
// Vite) for every consumer of the barrel, even ones who never touch
// `createFSRouter`, because those Node-only imports run at *import* time.
//
// These tests lock in the shape the fix depends on: the pure/browser-safe
// exports stay on the main barrel, `createFSRouter` moves to a dedicated
// `./fs` subpath, and both resolve correctly via the package's own name
// (self-reference), matching how an external consumer would import them.
// The actual "does this bundle for the browser" claim is verified
// separately with a real esbuild --platform=browser build (see PR
// description) since node:test can't drive a bundler.

test("Main barrel does not export createFSRouter", async () => {
  const barrel = await import("../index.mjs");
  assert.strictEqual(
    "createFSRouter" in barrel,
    false,
    "createFSRouter should not be re-exported from the main barrel " +
      "(it pulls in node:fs/node:path/theres-waldo at import time)"
  );
  // The rest of the barrel should still be there.
  for (const name of [
    "createRouter",
    "createRoute",
    "createRequest",
    "createResponse",
    "HTTPExpression",
  ]) {
    assert.strictEqual(
      typeof barrel[name],
      "function",
      `expected barrel to still export ${name}`
    );
  }
});

test("createFSRouter is exported from fs-router.mjs directly", async () => {
  const fsRouterModule = await import("../fs-router.mjs");
  assert.strictEqual(typeof fsRouterModule.createFSRouter, "function");
});

test("package.json exposes a ./fs subpath export for createFSRouter", async () => {
  const pkg = await import("../package.json", { with: { type: "json" } });
  const exportsMap = pkg.default.exports;
  assert.ok(exportsMap, "package.json should declare an exports map");
  // Both conditional blocks carry a `types` condition (see issue #9) in
  // addition to the `default` runtime target, so these are objects rather
  // than bare strings now.
  assert.strictEqual(exportsMap["./fs"].default, "./fs-router.mjs");
  assert.strictEqual(exportsMap["./fs"].types, "./fs.d.ts");
  assert.strictEqual(exportsMap["."].default, "./index.mjs");
  assert.strictEqual(exportsMap["."].types, "./types.d.ts");
});

test("@johnhenry/letterpress/fs resolves createFSRouter via self-reference", async () => {
  const fsSubpath = await import("@johnhenry/letterpress/fs");
  assert.strictEqual(typeof fsSubpath.createFSRouter, "function");
});

test("@johnhenry/letterpress (self-reference) does not carry createFSRouter", async () => {
  const barrel = await import("@johnhenry/letterpress");
  assert.strictEqual("createFSRouter" in barrel, false);
});
