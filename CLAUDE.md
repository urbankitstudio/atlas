# packages/atlas: rules for sessions working on @urbankitstudio/atlas

These rules apply in the monorepo (`urbankitstudio/urbankitstudio`, `packages/atlas/`) and in its public
mirror (`urbankitstudio/atlas`), where the sync copies this file to the repo root.

## What this package is
- `@urbankitstudio/atlas` on npm: the County Parcel REST API Atlas as JSON (`data/`) plus a typed SDK
  (`src/`). AI agents install it. It is one of three agent surfaces, with the stdio MCP server
  `@urbankitstudio/mcp-atlas` and the hosted MCP (`api/mcp.ts` in the monorepo).
- `data/` is generated from the monorepo's `public/data/atlas/` by `scripts/sync-atlas-package.mjs`
  (monorepo root: `npm run sync-atlas-package`; `npm run check-atlas-package` reports a stale copy).
  Never hand-edit `data/`.

## Edit here, never in the mirror
- Authored here, published from the public repo: npm attaches provenance only to an OIDC publish from
  a public repository, and the monorepo is private.
- `.github/workflows/atlas-sync-push.yml` rsyncs this directory over the public repo with `--delete`:
  on every push to main that touches `packages/atlas/`, after `Sync atlas-derived artifacts` succeeds,
  daily at 06:55 UTC, and on dispatch.
- The sync excludes only `.git/`, `.github/`, `.gitattributes`, `.gitignore` and `scripts/`. Those are
  the public repo's own files. Everything else there is a copy of this directory, and an edit made
  there is destroyed by the next sync. A check the public repo needs lives in its `.github/` or
  `scripts/` (its `scripts/verify-package.mjs` gates both its CI and its publish).
- Never push to the public repo by hand. Its main moves by the sync, and its `publish.yml` publishes
  over OIDC when main's `version` changes.
- This file is mirrored too. It stays out of the npm tarball because `files` in package.json lists only
  `dist`, `data`, `README.md` and `LICENSE`; keep it that way, and read `npm pack --dry-run` to check.

## The order: agent first (Leo, 2026-09-26)
Every new county, tool, feature or fix reaches this package and the MCP servers FIRST, in the same
change set. The paid meter and tiers come second. The site's free-tools UI comes last. Procedure: the
`agent-first-uks` skill.

## Release checklist
- [ ] A change to `data/` or to a type bumps `version` in package.json AND adds a `CHANGELOG.md`
      entry, in the SAME PR. Patch or minor follows the CHANGELOG's precedents: a data refresh is a
      patch, because `^0.6.0` never reaches a `0.7.0`.
- [ ] The merge is the release. The mirror carries the bump and the public repo's `publish.yml`
      publishes it. Nobody runs `npm publish`.
- [ ] Afterwards the site and npm agree: `npm view @urbankitstudio/atlas version` equals package.json,
      and the published `data/index.json` matches https://urbankitstudio.com/data/atlas/index.json on
      `totals` and `lastUpdated`.
- [ ] `@urbankitstudio/mcp-atlas` (repo `urbankitstudio/mcp-atlas`) owes a dependency bump + release on
      EVERY atlas release: package.json + lockfile, its CHANGELOG, both version fields of
      `server.json`. Its own PR, its own CI.

## The holds (where a miss is caught)
- Monorepo CI, `ci.yml` step "Agent surface ships with its packages": a PR touching an agent-surface
  path must move this `version` and `CHANGELOG.md`, or carry an `agent-first: <reason>` line in its body.
- Public repo `.github/workflows/package-currency.yml`, daily 07:25 UTC: PUBLISH LAG (package.json vs
  npm latest), DATA LAG (`data/index.json` vs the live site), UNBUMPED DATA (`data/` moved after the
  commit that set the version).
- Monorepo `advertised-version-drift.yml`, daily 06:40 UTC: the versions the site and docs advertise
  vs npm.

## Standing rules
- No `npm -g` and no global installs, ever; no `npx` for a binary absent from node_modules. Missing
  tooling is a blocker to report, not a thing to install.
- This package has its own node_modules and suite, outside the root `npm test`:
  `npm --prefix packages/atlas ci`, then `npm --prefix packages/atlas test`, `run typecheck`, `run build`.
- Its vitest suite (`test/**/*.test.ts`) is mirrored with everything else. The public repo's own
  tests are node:test files in its `scripts/`, where the sync cannot overwrite them.
