# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

This project will adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches 1.0.0.

## [0.0.0] - npm scope migration - 2026-09-19

### Changed (breaking)

- **Renamed the package from `leroute` to `@johnhenry/letterpress`**, and
  restarted the version at `0.0.0` (previously published as `leroute`, last
  unscoped version `0.0.1`).
- **Renamed the exported identifiers to match**: `createLeRoute` →
  `createRoute`, `createLeRouter` → `createRouter`, `LeRoute` → `Route`,
  `LeRouteInit` → `RouteInit`, `LeRouteMiddleware` → `RouteMiddleware`,
  `LeRouter` → `Router`, `LeRouterExtension` → `RouterExtension`,
  `LeRouterInit` → `RouterInit`, `LeRouterMiddleware` → `RouterMiddleware`.
  `create-leroute.mjs`/`create-lerouter.mjs` were also renamed to
  `create-route.mjs`/`create-router.mjs` (and their test files
  correspondingly), matching the new export names.
- **Raised `engines.node` to `>=26.0.0`**, matching the rest of the
  `@johnhenry/*` family's floor.

### Fixed

- 🐛 `test/index.mjs` imported `lerouter.mjs` twice and never imported `leroute.mjs`, silently dropping the `createRoute` test suite from `npm test`
- 🐛 `test/leroute.mjs` imported `createRoute` from `create-router.mjs` (which doesn't export it) instead of `create-route.mjs`, which would have thrown once the missing import above was fixed
- 🐛 `package.json` declared `"license": "ISC"` while the `LICENSE` file and README badge are MIT; changed to `"license": "MIT"` to match
- 📝 README and API docs referenced `serve` and `tagRequest` as exports of `leroute`; neither is exported — `serve` comes from the separate `leserve` package, and `tagRequest` doesn't exist. Docs corrected to list the real exports
- 📝 API docs showed `HTTPExpression(...)` as a constructor with `.method`/`.path`/`.version` properties; corrected to show it as a tagged-template function returning `{ test(request), exec(request) }`
- 🔒 **Security**: `router.endpoint` reused the per-request context object (which carries the incoming request's `Headers`) as the response-init object passed to `createRoute`, so every incoming request header — `Authorization`, `Cookie`, arbitrary custom headers — was echoed back on every response
- 🐛 `createRouter`'s dispatch loop called `handler(request, ctx)` without `await`, so an async handler that threw was never caught by the configured `errorHandler`/`defaultHandler` and instead crashed as an unhandled rejection
- 🐛 `createRoute` threw `Cannot read properties of null/undefined (reading 'toString')` on a `${null}`/`${undefined}` substitution instead of rendering nothing (ordinary template-literal semantics), even though a substitution *function* returning `undefined` was already treated as "no output"
- 🐛 A substitution *function* returning a `ReadableStream`/`Blob`/`ArrayBuffer`/`Uint8Array` fell through to `.toString()`, producing the literal string `"[object ReadableStream]"` instead of streaming the actual content (direct substitutions of these types already worked correctly)
- 🐛 `utility/dynamic-run.mjs` unconditionally attempted to `fs.unlink()` its temp file even when `fs.writeFile()` itself had failed, masking the real write error behind a misleading `ENOENT` — which `fs-router.mjs` then silently treated as "route not found" instead of surfacing a genuine permissions/disk-full failure. A cleanup (`unlink`) failure *after* a successful import also discarded the successful result
- 🐛 `fs-router.mjs`'s `index.html` handling wrote its synthesized temp module into leroute's own installed package directory instead of the matched route's directory — breaking the feature entirely in any deployment where the package install directory is read-only (containers, CI-built images)

### Added

- `"types"` field in `package.json` pointing to the existing `types.d.ts`
- A real `description` and `keywords` in `package.json` (previously empty)

### Removed

- Deleted `utility/cd.mjs`, an unused debug scratch file with no imports and no tests

## 0.0.0 (as `Route`/`loute`, pre-rename) - 2024-08-26

> Disambiguation: this is the *original* initial release, under an earlier
> name and a separate version-number sequence (`phrouter` 1.0.0 -> `loute`
> 0.0.0 -> `leroute` 0.0.0 -> `leroute` 0.0.1), predating the npm scope
> migration entry above, which is also numbered `0.0.0` per family
> convention (the version resets on scope import). These are two different
> releases that happen to share a version number.

### Added

- 🎉 Initial release of Route
- 🛠 Core routing functionality
- 🛠 HTTP request and response handling
- 🛠 TypeScript definitions
- 🛠 Support for route parameters and query strings
