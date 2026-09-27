import { test } from "node:test";
import assert from "node:assert";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Regression test for https://github.com/johnhenry/letterpress/issues/9:
//
// package.json's `exports` map had no `types` condition, so under
// Bundler/Node16/NodeNext module resolution TypeScript ignored the legacy
// top-level `types` field entirely -- `import { createRouter } from
// '@johnhenry/letterpress'` type-checked as `any`/TS7016. Even with that
// fixed, types.d.ts declared only type aliases (Router, CreateRouter, ...)
// with no value declarations for the actual exports, so the import itself
// would still fail with TS2305.
//
// This spawns a real `tsc --noEmit` against test/types/fixture.ts, which
// imports "@johnhenry/letterpress" and "@johnhenry/letterpress/fs" by
// their published package names (self-reference, exactly as an external
// consumer would) and references every named export. node:test can't
// type-check anything itself, so this is the only thing in the suite that
// actually exercises types.d.ts/fs.d.ts/package.json#exports the way a
// real TypeScript consumer does.

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(fileURLToPath(import.meta.url), "../..");
const tscBin = path.join(rootDir, "node_modules", ".bin", "tsc");
const tsconfigPath = path.join(rootDir, "tsconfig.json");

test("published .d.ts files type-check for a consumer importing by package name", async () => {
  try {
    const { stdout } = await execFileAsync(
      tscBin,
      ["--noEmit", "-p", tsconfigPath],
      { cwd: rootDir }
    );
    assert.strictEqual(
      stdout.trim(),
      "",
      `expected no tsc output, got:\n${stdout}`
    );
  } catch (error) {
    assert.fail(
      "tsc --noEmit failed against test/types/fixture.ts -- this means " +
        "the shipped types.d.ts/fs.d.ts (or package.json's `exports` " +
        "map) are broken for a real TypeScript consumer:\n" +
        `${error.stdout ?? ""}${error.stderr ?? error.message}`
    );
  }
});
