export { createRequest } from "./create-request.mjs";
export { createRouter } from "./create-router.mjs";
export { createRoute } from "./create-route.mjs";
export { createResponse } from "./create-response.mjs";
export { tagRequest } from "./tag-request.mjs";
export { tagResponse } from "./tag-response.mjs";
export * from "./utility/index.mjs";
export { deconstruct } from "./utility/deconstruct.mjs";
export { cook } from "./utility/cook.mjs";

// `createFSRouter` is intentionally NOT re-exported from this barrel.
// fs-router.mjs imports `node:fs`, `node:path`, and `theres-waldo` (which
// itself uses `fileURLToPath` from `node:url`) at module top level. Those
// side effects run at *import* time, not call time, so merely having this
// barrel import fs-router.mjs breaks browser bundlers (e.g. Vite) for every
// consumer, even ones who never call createFSRouter -- and shimming
// `node:fs`/`node:path` doesn't help, since the fs-router module body still
// executes on import. Import createFSRouter from the dedicated Node-only
// subpath instead:
//   import { createFSRouter } from "@johnhenry/letterpress/fs";
