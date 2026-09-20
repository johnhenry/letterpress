/**
 * @file fs-router.mjs
 * @description Implements a filesystem-based router for handling HTTP requests.
 * This router maps URL paths to directory structures and matches HTTP methods to
 * corresponding JavaScript modules (.mjs files).
 */

import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import dynamicRun from "./utility/dynamic-run.mjs";
const ALL = "all";
import theresWaldo from "theres-waldo";
const { dir } = theresWaldo(import.meta.url);

/**
 * @typedef {import('./types').Route} Route
 */

/**
 * Creates a filesystem-based router
 * @param {string} baseDir - The base directory for routing
 * @returns {Route} A Route function
 *
 * @description
 * This function creates a router that maps URL paths to a directory structure.
 * It looks for files named [http method].mjs in the corresponding directories
 * and executes the default exported function from these files.
 *
 * Directory Structure:
 * The router expects a directory structure that mirrors the URL path structure.
 * For example, for a URL path /user/profile, the directory structure would be:
 *
 * /baseDir
 *   /user
 *     /profile
 *       get.mjs
 *       post.mjs
 *       ...
 *
 * Path Parameters:
 * Path parameters are denoted by directories starting with '#'.
 * For example, /user/#id would match a URL like /user/123, and the 'id' parameter
 * would be available in the request object passed to the handler function.
 *
 * Handler Functions:
 * Each [http method].mjs file should export a default function of type Route.
 * This function will receive the request object, augmented with a 'params' property
 * containing any path parameters.
 *
 * @example
 * // Usage:
 * import { createFSRouter } from './fs-router.mjs';
 * import path from 'path';
 *
 * const baseDir = path.join(process.cwd(), 'routes');
 * const router = createFSRouter(baseDir);
 *
 * // Then use this router with your server implementation
 * server.on('request', async (req, res) => {
 *   const result = await router(req);
 *   if (result) {
 *     // Handle the result
 *   } else {
 *     // Handle 404 Not Found
 *   }
 * });
 */
export function createFSRouter(
  baseDir,
  defaultHandler = () => new Response("not found", { status: 404 })
) {
  return async function fsRouter(req) {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method.toLowerCase();

    // Split the pathname into segments
    const segments = pathname.split("/").filter(Boolean);

    // Try to find a matching file
    let currentPath = baseDir;
    const params = {};

    for (const segment of segments) {
      const dir = await fs.readdir(currentPath, { withFileTypes: true });
      const match = dir.find(
        (dirent) =>
          dirent.isDirectory() &&
          (dirent.name === segment || dirent.name.startsWith("#"))
      );

      if (!match) {
        return null; // No matching path found
      }

      if (match.name.startsWith("#")) {
        params[match.name.slice(1)] = segment;
      }

      currentPath = path.join(currentPath, match.name);
    }

    // Look for a matching method file
    let methodFile = path.join(currentPath, `${method}.mjs`);

    let html;
    try {
      // Check if the file exists before attempting to import
      try {
        await fs.access(methodFile);
      } catch {
        try {
          methodFile = path.join(currentPath, `index.html`);
          await fs.access(methodFile);
          html = true;
        } catch {
          methodFile = path.join(currentPath, `${ALL}.mjs`);
          await fs.access(methodFile);
        }
      }

      // Convert the file path to a file URL
      const fileUrl = pathToFileURL(methodFile).href;

      let module;
      if (html) {
        const file = await fs
          .readFile(methodFile, { encoding: "utf-8" })
          .catch((e) => {
            console.error(e);
            return "";
          });
        const data = `import {createRoute} from "${path.join(
          dir,
          "./index.mjs"
        )}";
        export default createRoute()\`${file}\``;
        // Write the synthesized temp module next to the matched route's
        // index.html (currentPath), not into letterpress's own package
        // directory (dir). Writing into the package dir means every
        // index.html request requires the installed package directory
        // (e.g. node_modules/@johnhenry/letterpress) to be writable, which
        // commonly isn't true in production (read-only installs/
        // containers), and has nothing to do with the route being served.
        module = await dynamicRun(data, currentPath);
      } else {
        module = await import(fileUrl);
      }
      const handler = module.default;
      if (typeof handler !== "function") {
        throw new Error(`${methodFile} does not export a default function`);
      }
      return handler(req, { params });
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ERR_MODULE_NOT_FOUND") {
        return defaultHandler(req, { params });
      }
      throw error; // Re-throw other errors
    }
  };
}
