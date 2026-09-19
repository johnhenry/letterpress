import { test } from "node:test";
import assert from "node:assert";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createFSRouter } from "../fs-router.mjs";

test("fs-router - writes the synthesized index.html temp module into the matched route directory", async () => {
  // Regression test: fs-router used to pass leroute's own package directory
  // (from theresWaldo(import.meta.url)) to dynamicRun instead of the
  // matched route's directory. That meant every index.html request required
  // the *installed package's own directory* (e.g. node_modules/leroute) to
  // be writable - unrelated to, and often less permissive than, the app's
  // own route directory - and had nothing to do with where the index.html
  // actually lived.
  const tmpRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "leroute-fsrouter-")
  );
  const routeDir = path.join(tmpRoot, "routes");
  await fs.mkdir(routeDir, { recursive: true });
  await fs.writeFile(
    path.join(routeDir, "index.html"),
    "<p>hello ${() => 1 + 1}</p>"
  );

  const writtenPaths = [];
  const originalWriteFile = fs.writeFile;
  fs.writeFile = (filePath, ...rest) => {
    writtenPaths.push(filePath);
    return originalWriteFile(filePath, ...rest);
  };

  let response;
  try {
    const router = createFSRouter(routeDir);
    const request = new Request("http://localhost/", {
      headers: { host: "localhost" },
    });
    response = await router(request);
  } finally {
    fs.writeFile = originalWriteFile;
  }

  try {
    assert.equal(response.status, 200);
    assert.match(await response.text(), /hello 2/);
    assert.equal(writtenPaths.length, 1);
    assert.equal(
      path.dirname(writtenPaths[0]),
      routeDir,
      "temp module should be written into the matched route directory, not the leroute package directory"
    );
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});

test("fs-router - cleans up its temp module after serving an index.html route", async () => {
  const tmpRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "leroute-fsrouter-")
  );
  const routeDir = path.join(tmpRoot, "routes");
  await fs.mkdir(routeDir, { recursive: true });
  await fs.writeFile(path.join(routeDir, "index.html"), "<p>hi</p>");

  try {
    const router = createFSRouter(routeDir);
    const request = new Request("http://localhost/", {
      headers: { host: "localhost" },
    });
    const response = await router(request);
    assert.equal(response.status, 200);

    const remaining = await fs.readdir(routeDir);
    assert.deepEqual(
      remaining.sort(),
      ["index.html"],
      "no orphaned temp-*.mjs file should remain after the request"
    );
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});
