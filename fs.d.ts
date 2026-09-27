// Type declarations for the @johnhenry/letterpress/fs subpath.
//
// createFSRouter is intentionally NOT re-exported from the main barrel
// (see index.mjs's comment: it imports node:fs/node:path/theres-waldo at
// module top level, which breaks browser bundlers for every consumer).
// It's only reachable via this dedicated Node-only subpath, so its types
// live in their own declaration file rather than in types.d.ts -- see
// https://github.com/johnhenry/letterpress/issues/9.

// Context passed to the fs-router's defaultHandler: path params collected
// while walking the filesystem for a `#param`-style directory segment.
export type FSRouterContext = {
  params: Record<string, string>;
};

// Handler invoked when no matching route file/directory is found.
export type FSRouterDefaultHandler = (
  request: Request,
  context: FSRouterContext
) => Response | Promise<Response>;

// The router function returned by createFSRouter(). Resolves to `null`
// when no matching path segment is found while walking baseDir.
export type FSRouter = (request: Request) => Promise<Response | null>;

// Function to create a filesystem-based router: maps URL paths to
// `[method].mjs` files (or `index.html`) under a directory structure that
// mirrors the URL path, with `#name` directories acting as path params.
export type CreateFSRouter = (
  baseDir: string,
  defaultHandler?: FSRouterDefaultHandler
) => FSRouter;

export declare const createFSRouter: CreateFSRouter;
