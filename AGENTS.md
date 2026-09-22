# Agent playbook

`@johnhenry/letterpress` -- a tagged-template-string HTTP routing library:
defining and matching request handlers with plain JavaScript syntax. Single
package, Node >= 26, `node:test` (`npm test` runs `test/index.mjs`), ships
source directly (`index.mjs` + friends); no build step.

`CLAUDE.md` in this directory is a symlink to this file.

## The verification loop (before every push)

1. `npm test` -- runs `node --test test/index.mjs`, which must itself
   import every test module (see gotcha below -- this has silently dropped
   whole suites before).
2. A genuinely fresh clone:
   `git clone . /tmp/letterpress-verifyN && cd $_ && npm ci && npm test`.
   This is the only way to catch "works on my checked-out tree" bugs
   (missing `files` entries, undeclared deps).
3. Commit, push, close the issue with a comment naming the commit SHA.

CI (`.github/workflows/ci.yml`) runs the same `npm test` command; match it
locally.

## Repo-specific gotchas

- **`test/index.mjs` is a hand-maintained list of test-file imports, not a
  glob.** A past bug imported one file twice and never imported the other,
  silently dropping an entire suite from `npm test` with a passing exit
  code. When you add a new `test/*.mjs` file, add its import to
  `test/index.mjs` and verify the new suite's assertions actually ran (not
  just that `npm test` exited 0).
- **`createRoute` substitutions are not escaped.** See
  `## Honest limitations` in the README before treating unescaped HTML
  output as a bug to silently "fix" with auto-escaping -- that would be a
  breaking behavior change, not a bugfix, and needs its own CHANGELOG entry
  and version bump if done.
- **`createRouter`'s dispatch loop must `await` the handler.** A past bug
  called `handler(request, ctx)` without awaiting it, so an async handler
  that threw crashed as an unhandled rejection instead of being caught by
  `errorHandler`/`defaultHandler`. Any new dispatch path must await.
- **`fs-router.mjs`'s synthesized `index.html` temp module is written next
  to the matched route's own directory, not into `letterpress`'s installed
  package directory.** A past bug wrote it into the package dir, which
  broke the whole feature under any read-only install (containers,
  CI-built images). Keep new temp-file writes scoped to the route
  directory, and don't `unlink` a temp file when the write that created it
  already failed (that masks the real error as a misleading `ENOENT`).

## Definition of done

A change is done when all of the following hold, not just when tests pass:
- A regression test exists for any bug fixed, and is actually wired into
  `test/index.mjs` (see gotcha above).
- Anything the feature does **not** do is stated in the README's
  `## Honest limitations` section, not only in an issue comment.
- `CHANGELOG.md` has an entry.
- `api.md` is re-checked against the real exports if the change touches
  public API shape.

## Releases

Bump `version` in `package.json` in a PR, add the `CHANGELOG.md` entry,
merge, then `gh release create v<version>` -- the release event triggers
`.github/workflows/publish.yml`, which is idempotent (skips if the version
is already on npm).
