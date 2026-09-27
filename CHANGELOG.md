# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

This project will adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches 1.0.0.

## [0.0.3] - 2026-09-26

### Fixed

- 🐛 **Types**: `RouterExtension.endpoint` (added by the `#9` fix) was
  declared to return `Router` directly, i.e. callable only through
  `Route`'s `(request: Request) => Response` signature. But at runtime
  (and per the README's own documented examples) `router.endpoint` is
  curried: the first tagged-template call defines the match pattern
  (method/path/headers), and the *second* call — on the value the first
  call returns — is either another tagged template supplying a raw HTTP
  response literal (e.g.
  `` router.endpoint`GET /x`` `HTTP/1.1 200 OK\n\n...`` ``) or a plain
  handler function (`(request) => Response`), both registering the route
  and returning the same `Router`. The old declaration didn't model this
  curried, dual-mode second call at all, forcing consumers to fall back to
  `@ts-expect-error`/`any`. Added `RouterEndpointResponder`, a callable
  type with two overload signatures (tagged-template and single-handler),
  and changed `RouterExtension.endpoint`'s return type from `Router` to
  `RouterEndpointResponder`. Extended `test/types/fixture.ts` with both
  curried forms (verified to fail to type-check against the pre-fix
  declaration, and to pass cleanly against the fix) so a regression here
  is caught by `npm test`/`npm run typecheck` instead of relying on
  someone eyeballing `types.d.ts`
  ([#11](https://github.com/johnhenry/letterpress/issues/11))

## [0.0.2] - 2026-09-26

### Fixed

- 🐛 **Types**: `package.json` declared a legacy top-level `"types":
  "types.d.ts"`, but the `exports` map had no `types` condition. With an
  `exports` map present, TypeScript (Bundler/Node16/NodeNext resolution)
  ignores the legacy top-level `types` field entirely, so
  `` import { createRouter } from '@johnhenry/letterpress' `` was untyped
  (`TS7016`). Even fixing that alone wasn't enough: `types.d.ts` declared
  only type *aliases* (`Router`, `CreateRouter`, `CreateRoute`,
  `RouterInit`, …) with no *value* declarations for the actual named
  exports, so the import would still fail with `TS2305`. Added `types`
  conditions to `exports["."]` (→ `types.d.ts`) and `exports["./fs"]`
  (→ a new `fs.d.ts`, since `createFSRouter` isn't on the main barrel —
  see the `#6`/`#7` fix above), and added value declarations for every
  actual named export: `createRouter`, `createRoute`, `createRequest`,
  `createResponse`, `deconstruct`, `cook`, `HTTPExpression` (from
  `index.mjs`, including its `utility/index.mjs` re-exports), and
  `createFSRouter` (from the `./fs` subpath). Added a `test/types/fixture.ts`
  fixture that imports `@johnhenry/letterpress` and
  `@johnhenry/letterpress/fs` by their published package names and
  references every one of those exports, type-checked via `tsc --noEmit`
  in `test/types.test.mjs` (now part of `npm test`), plus a standalone
  `npm run typecheck` script, so a regression here fails the test suite
  instead of only being caught by a consumer eyeballing the `.d.ts` files
  ([#9](https://github.com/johnhenry/letterpress/issues/9))

## [0.0.1] - 2026-09-26

### Fixed

- 🐛 **Security/reliability**: The colon-form header matcher documented in
  the README (`` router.endpoint`GET /protected [Authorization: Bearer *]` ``)
  parsed the `:` and everything up to the wildcard as part of the header
  *name* instead of stopping the name at `:`, so `headers.get()` threw
  `TypeError: invalid header name`. Because `createRouter`'s dispatch loop
  calls matchers inside a top-level try/catch, this 500'd **every** request
  routed through a router with such a route registered — not just requests
  matching that path — for any consumer who followed the README's own
  documented syntax. `parseHeaderMatcher`'s header-name capture now stops at
  `:` (in addition to the existing operator characters), and the value
  after the colon is treated as a wildcard-match pattern (`*` matches any
  run of characters), so `[Authorization: Bearer *]` matches any bearer
  token instead of crashing. The operator-form equivalent,
  `[Authorization^=Bearer]`, is unaffected and continues to work
  ([#4](https://github.com/johnhenry/letterpress/issues/4))
- 🐛 **Bundling**: The main barrel (`index.mjs`) re-exported `createFSRouter`
  from `fs-router.mjs`, which imports `node:fs`, `node:path`, and
  `theres-waldo` (itself using `node:url`'s `fileURLToPath`) at module top
  level. Those imports run at *import* time, so simply importing anything
  from `@johnhenry/letterpress` — even `HTTPExpression` or `createRoute`,
  which have nothing to do with the filesystem router — pulled in
  Node-only code and broke browser bundlers (e.g. Vite), even when the
  Node builtins were shimmed, because the fs-router module body still ran.
  `createFSRouter` is no longer re-exported from the main barrel; it's now
  reachable via a dedicated `@johnhenry/letterpress/fs` subpath (added to a
  new `package.json` `"exports"` map, alongside a `"./*"` wildcard so
  existing deep-path imports like
  `@johnhenry/letterpress/utility/http-expression.mjs` keep working
  unchanged). Everything else in the barrel (`createRouter`, `createRoute`,
  `createRequest`, `createResponse`, `HTTPExpression`) was already pure and
  is now verified to bundle cleanly for the browser
  ([#6](https://github.com/johnhenry/letterpress/issues/6))

### Changed (breaking)

- **`createFSRouter` is no longer exported from the main `@johnhenry/letterpress`
  barrel.** Import it from `@johnhenry/letterpress/fs` instead. This is the
  only export affected; everything else's import path is unchanged.

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
