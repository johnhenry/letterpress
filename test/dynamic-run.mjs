import { test } from "node:test";
import assert from "node:assert";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import dynamicRun from "../utility/dynamic-run.mjs";

test("dynamicRun - surfaces the original error when writing the temp file fails, instead of masking it with a cleanup ENOENT", async () => {
  // Regression test: dynamicRun's catch block used to call
  // `await fs.unlink(tempFilePath)` unconditionally, even when
  // `fs.writeFile` itself was the thing that failed (so the temp file was
  // never created). That unlink attempt threw its own ENOENT, which
  // replaced/masked the real underlying error (e.g. a permissions or
  // disk-full failure) - and fs-router.mjs specifically treats ENOENT as
  // "route not found", silently turning a real write failure into a 404.
  const originalWriteFile = fs.writeFile;
  const originalUnlink = fs.unlink;
  let unlinkCalled = false;

  fs.writeFile = async () => {
    const error = new Error("simulated EACCES: permission denied");
    error.code = "EACCES";
    throw error;
  };
  fs.unlink = async (...args) => {
    unlinkCalled = true;
    return originalUnlink(...args);
  };

  try {
    await assert.rejects(
      () => dynamicRun("export default 1;", os.tmpdir()),
      (error) => {
        assert.equal(error.code, "EACCES");
        assert.match(error.message, /simulated EACCES/);
        return true;
      }
    );
    assert.equal(
      unlinkCalled,
      false,
      "unlink should not be attempted for a file that was never written"
    );
  } finally {
    fs.writeFile = originalWriteFile;
    fs.unlink = originalUnlink;
  }
});

test("dynamicRun - a cleanup (unlink) failure after a successful import does not discard the imported module", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "letterpress-dynrun-"));
  const originalUnlink = fs.unlink;
  fs.unlink = async () => {
    const error = new Error("simulated cleanup failure");
    throw error;
  };

  try {
    const result = await dynamicRun(
      "export default 42;",
      tmpDir
    );
    assert.equal(result.default, 42);
  } finally {
    fs.unlink = originalUnlink;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
