#!/usr/bin/env node
/**
 * Is the published @urbankitstudio/atlas current? Asked every day by
 * .github/workflows/package-currency.yml.
 *
 * WHY. On 2026-09-26 Leo made the packages AI agents install the FIRST surface
 * of every UrbanKit Studio change: a new county, tool or fix reaches npm and
 * the MCP servers before the paid tiers are touched and before the site. That
 * order is real only if a lag gets noticed, and the facts that show a lag live
 * OUTSIDE this repo: the version npm serves, and the data the live site
 * serves. No hermetic test can see either. This script looks outward, like the
 * monorepo's scripts/check-advertised-versions.mjs, which it is modelled on.
 *
 * THREE CHECKS, one per link between the site and `npm install`:
 *
 *   PUBLISH LAG    package.json here against npm's `latest`.
 *                  Repo ahead: the publish did not happen.
 *                  npm ahead: this mirror lags the release.
 *   DATA LAG       data/index.json here against the live site's
 *                  /data/atlas/index.json, on totals.counties,
 *                  totals.endpoints and lastUpdated. The site ahead on any of
 *                  them: the package data lags the site. The site BEHIND is a
 *                  warning, not a failure: npm is not late then, the site is.
 *   UNBUMPED DATA  data/ changed after the commit that set the current
 *                  version. npm still serves the old data under the same
 *                  number, and every sync in between looked healthy. It
 *                  happened: after 595e9b6 set 0.6.6, 59d3bee and aa5336d
 *                  moved five files under data/, and the version did not move
 *                  again until 0.6.7.
 *
 * Green on all three means npm's latest carries the data the site serves.
 *
 * Every check runs even after another goes red, so one run names every broken
 * link. "Could not ask" is not "current": a registry or site that does not
 * answer, or a history that cannot be walked, is red with its own message.
 *
 * Usage:  node scripts/check-package-currency.mjs [repoDir]
 *   repoDir defaults to this script's repository. ATLAS_CURRENCY_REGISTRY_URL
 *   and ATLAS_CURRENCY_SITE_URL replace the two URLs when set; that is how
 *   scripts/package-currency.test.mjs runs the whole script against a local
 *   server. The workflow sets neither, and that test asserts it.
 * Exit 0 = no red (a warning may be printed). Exit 1 = at least one red.
 */
import { readFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REGISTRY_LATEST_URL = "https://registry.npmjs.org/@urbankitstudio%2Fatlas/latest";
export const SITE_INDEX_URL = "https://urbankitstudio.com/data/atlas/index.json";

/** The monorepo's convention for scripts that call out: browser-like, and
 *  named, so a server log can tell what asked. */
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) atlas-package-currency/1.0";
const TIMEOUT_MS = 20_000;

export const REMEDY =
  "bump packages/atlas version + CHANGELOG in the UKS monorepo; the mirror and the publish follow";

// ------------------------------------------------------------------ semver --
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/;

/** Throws on anything that is not a plain semver string. An unparseable
 *  version must never compare as "equal": that is how a lax compare turns a
 *  broken input into a green check. */
export function parseSemver(version) {
  const m = typeof version === "string" ? SEMVER.exec(version) : null;
  if (!m) throw new Error(`${JSON.stringify(version)} is not a semver version`);
  return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split(".") : [] };
}

/** Semver precedence as -1, 0 or 1. Numeric, never lexical: as strings
 *  "0.10.0" sorts before "0.9.0", which would name the wrong direction on
 *  exactly the bump where it matters. Build metadata is ignored. */
export function compareSemver(a, b) {
  const x = parseSemver(a);
  const y = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (x.core[i] !== y.core[i]) return x.core[i] < y.core[i] ? -1 : 1;
  }
  if (x.pre.length === 0 && y.pre.length === 0) return 0;
  if (x.pre.length === 0) return 1; // a release outranks its prereleases
  if (y.pre.length === 0) return -1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i += 1) {
    const p = x.pre[i];
    const q = y.pre[i];
    if (p === undefined) return -1; // the shorter set of identifiers sorts first
    if (q === undefined) return 1;
    const pNum = /^\d+$/.test(p);
    const qNum = /^\d+$/.test(q);
    if (pNum && qNum) {
      if (Number(p) !== Number(q)) return Number(p) < Number(q) ? -1 : 1;
    } else if (pNum !== qNum) {
      return pNum ? -1 : 1; // numeric identifiers sort before alphanumeric ones
    } else if (p !== q) {
      return p < q ? -1 : 1;
    }
  }
  return 0;
}

// ---------------------------------------------------------------- verdicts --
const ok = (check, message) => ({ check, status: "ok", message });
const warn = (check, message) => ({ check, status: "warn", message });
const red = (check, message) => ({ check, status: "red", message });

const explain = (err) => {
  const cause = err?.cause?.code ?? err?.cause?.message;
  return `${err?.message ?? String(err)}${cause ? ` (${cause})` : ""}`;
};

/** The one message for a source that did not answer, kept distinct so a red
 *  that means "unknown" is never read as a red that means "late", or worse,
 *  as nothing at all. */
export function couldNotAsk(check, source, err) {
  return red(
    check,
    `could not ask ${source}: ${explain(err)}. This is NOT a verdict that the package is current; the check did not run.`,
  );
}

export function publishLagVerdict(repoVersion, npmVersion) {
  const CHECK = "PUBLISH LAG";
  let order;
  try {
    order = compareSemver(repoVersion, npmVersion);
  } catch (err) {
    return red(
      CHECK,
      `cannot compare this checkout's ${JSON.stringify(repoVersion)} with npm's ${JSON.stringify(npmVersion)}: ${err.message}`,
    );
  }
  if (order === 0) return ok(CHECK, `package.json ${repoVersion} = npm latest ${npmVersion}`);
  if (order > 0) {
    return red(
      CHECK,
      `this checkout is ${repoVersion} but npm latest is ${npmVersion}: the repo is AHEAD of npm, so the publish did not happen. ` +
        `Read the publish.yml run for the push that moved the version. npm's latest can trail a finished publish by a minute or two, so re-run once before acting.`,
    );
  }
  return red(
    CHECK,
    `npm latest is ${npmVersion} but this checkout is ${repoVersion}: npm is AHEAD of the repo, so this mirror lags the release. ` +
      `This repo moves only when the monorepo's atlas-sync-push.yml pushes; read its runs.`,
  );
}

const FIELDS = ["counties", "endpoints", "lastUpdated"];

/** The three facts DATA LAG compares, or null for any that is missing or
 *  malformed. Comparing undefined with a number is false both ways, which
 *  reads as "equal"; a null makes the verdict say "cannot judge" instead. */
export function indexFacts(index) {
  const int = (v) => (Number.isInteger(v) ? v : null);
  const date = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);
  return {
    counties: int(index?.totals?.counties),
    endpoints: int(index?.totals?.endpoints),
    lastUpdated: date(index?.lastUpdated),
  };
}

export function dataLagVerdict(packaged, live, { repoVersion = null, npmVersion = null } = {}) {
  const CHECK = "DATA LAG";
  const versions = `This checkout is ${repoVersion ?? "unreadable"}; npm latest is ${npmVersion ?? "unknown"}.`;
  const unjudged = FIELDS.filter((f) => packaged[f] === null || live[f] === null);
  if (unjudged.length) {
    const detail = unjudged
      .map((f) => `${f} (package ${JSON.stringify(packaged[f])}, site ${JSON.stringify(live[f])})`)
      .join(", ");
    return red(CHECK, `cannot judge ${detail}: missing or malformed in one of the two indexes. ${versions}`);
  }
  const value = (f, v) => (f === "lastUpdated" ? Date.parse(v) : v);
  const ahead = [];
  const behind = [];
  for (const f of FIELDS) {
    const delta = value(f, live[f]) - value(f, packaged[f]);
    const pair = `${f} (site ${live[f]}, package ${packaged[f]})`;
    if (delta > 0) ahead.push(pair);
    else if (delta < 0) behind.push(pair);
  }
  if (ahead.length) {
    return red(
      CHECK,
      `the live site is AHEAD of this repo's data/index.json on ${ahead.join(", ")}. ${versions} ` +
        `The package data lags the site. In the monorepo, \`npm run check-atlas-package\` says whether packages/atlas/data is stale, ` +
        `and the atlas-artifact-sync.yml and atlas-sync-push.yml runs say where it stopped; then ${REMEDY}.`,
    );
  }
  if (behind.length) {
    return warn(
      CHECK,
      `the live site TRAILS this repo's data/index.json on ${behind.join(", ")}. ${versions} ` +
        `npm is not late; the site's deploy probably is.`,
    );
  }
  return ok(
    CHECK,
    `data/index.json = live site: ${packaged.counties} counties, ${packaged.endpoints} endpoints, lastUpdated ${packaged.lastUpdated}. ${versions}`,
  );
}

export function unbumpedDataVerdict({ version, releaseCommit, changedFiles }) {
  const CHECK = "UNBUMPED DATA";
  const at = String(releaseCommit).slice(0, 7);
  if (changedFiles.length === 0) {
    return ok(CHECK, `data/ unchanged since ${at}, the commit that set ${version}`);
  }
  const shown =
    changedFiles.slice(0, 10).join(", ") +
    (changedFiles.length > 10 ? `, and ${changedFiles.length - 10} more` : "");
  return red(
    CHECK,
    `${changedFiles.length} file(s) under data/ changed after ${at}, the commit that set ${version}: ${shown}. ` +
      `npm still serves the ${version} data under the same number. Remedy: ${REMEDY}.`,
  );
}

// ------------------------------------------------------------------ history --
/** A git runner bound to one repository. `-C` rather than a cwd, so the
 *  caller's working directory never matters. Plumbing commands only below:
 *  porcelain output bends to user config (log.showSignature, color.ui). */
export function gitIn(repoDir) {
  return (args) =>
    execFileSync("git", ["-C", repoDir, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
}

/** The commit that set HEAD's version. Walks the commits that touched
 *  package.json, newest first (`rev-list`, the plumbing form of
 *  `git log --format=%H -- package.json`), and stops at the first whose
 *  version differs from HEAD's. The last one that still matched is where the
 *  number was set; a later commit that touched only the description does not
 *  count as a release. */
export function findReleaseCommit(git) {
  // 🔴 A shallow checkout ends this walk at the graft, which then looks like
  // the release commit, so every data change since the real release would be
  // forgiven and the check would pass without checking. Refuse instead.
  if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") {
    throw new Error(
      "the checkout is shallow, so the walk cannot reach the commit that set the version; check out with fetch-depth: 0",
    );
  }
  const versionAt = (rev) => {
    try {
      return JSON.parse(git(["cat-file", "blob", `${rev}:package.json`])).version;
    } catch {
      return undefined;
    }
  };
  const version = versionAt("HEAD");
  if (typeof version !== "string") throw new Error("HEAD has no readable package.json version");
  let releaseCommit = null;
  const touched = git(["rev-list", "HEAD", "--", "package.json"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const sha of touched) {
    if (versionAt(sha) !== version) break;
    releaseCommit = sha;
  }
  if (releaseCommit === null) {
    throw new Error(`no commit that touched package.json carries HEAD's version ${version}`);
  }
  return { version, releaseCommit };
}

/** Files under data/ that differ between `base` and HEAD: the tree diff that
 *  `git diff --name-only <base>..HEAD -- data/` prints, in plumbing form. */
export function dataChangedSince(git, base) {
  return git(["diff-tree", "-r", "--name-only", base, "HEAD", "--", "data/"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// -------------------------------------------------------------------- run --
export async function fetchJson(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
    // Inside the try, so the timeout covers a body that stalls as well.
    return await res.json();
  } catch (err) {
    if (controller.signal.aborted) throw new Error(`no answer within ${timeoutMs / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** A check that throws where nobody expected it is still a red for that
 *  check, never an end to the run. */
async function guarded(check, fn) {
  try {
    return await fn();
  } catch (err) {
    return red(check, `the check itself failed: ${explain(err)}`);
  }
}

/** Runs all three checks and returns their verdicts; prints nothing. */
export async function run({ root, registryUrl, siteUrl, getJson = fetchJson, git = gitIn(root) }) {
  const readLocal = (rel) => {
    try {
      return { value: JSON.parse(readFileSync(join(root, rel), "utf8")) };
    } catch (err) {
      return { error: err };
    }
  };
  const manifest = readLocal("package.json");
  const repoVersion = typeof manifest.value?.version === "string" ? manifest.value.version : null;
  const packagedIndex = readLocal("data/index.json");
  let npmVersion = null;

  const verdicts = [];

  verdicts.push(
    await guarded("PUBLISH LAG", async () => {
      let body;
      try {
        body = await getJson(registryUrl);
        if (typeof body?.version !== "string") throw new Error("it answered without a version field");
      } catch (err) {
        return couldNotAsk("PUBLISH LAG", `the npm registry (${registryUrl})`, err);
      }
      npmVersion = body.version;
      if (repoVersion === null) {
        return red(
          "PUBLISH LAG",
          `could not read this checkout's package.json version: ${manifest.error ? explain(manifest.error) : "no version string"}`,
        );
      }
      return publishLagVerdict(repoVersion, npmVersion);
    }),
  );

  verdicts.push(
    await guarded("DATA LAG", async () => {
      let live;
      try {
        live = await getJson(siteUrl);
      } catch (err) {
        return couldNotAsk("DATA LAG", `the live site (${siteUrl})`, err);
      }
      if (packagedIndex.error) {
        return red("DATA LAG", `could not read this checkout's data/index.json: ${explain(packagedIndex.error)}`);
      }
      return dataLagVerdict(indexFacts(packagedIndex.value), indexFacts(live), { repoVersion, npmVersion });
    }),
  );

  verdicts.push(
    await guarded("UNBUMPED DATA", async () => {
      let found;
      let changedFiles;
      try {
        found = findReleaseCommit(git);
        changedFiles = dataChangedSince(git, found.releaseCommit);
      } catch (err) {
        return red(
          "UNBUMPED DATA",
          `could not walk this repo's history: ${explain(err)}. This is NOT a verdict that every data change was released.`,
        );
      }
      return unbumpedDataVerdict({ ...found, changedFiles });
    }),
  );

  return verdicts;
}

/** GitHub reads `::error::` and `::warning::` lines as annotations, and
 *  decodes `%` sequences in their text, so `%`, CR and LF are escaped. */
const escapeData = (text) => text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

export function render(verdicts) {
  return verdicts.map((v) => {
    if (v.status === "ok") return `ok    ${v.check}: ${v.message}`;
    const kind = v.status === "warn" ? "warning" : "error";
    return `::${kind}::${escapeData(`${v.check}: ${v.message}`)}`;
  });
}

export const exitCodeFor = (verdicts) => (verdicts.some((v) => v.status === "red") ? 1 : 0);

// ------------------------------------------------------------------- main --
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** True only when node was pointed at this file. Imported by the tests, it
 *  must stay silent; executed by the workflow, it must run. The second half is
 *  the one that fails quietly (exit 0, nothing checked), so the tests execute
 *  the file directly and read what it prints. */
function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    const self = realpathSync(fileURLToPath(import.meta.url));
    const entry = realpathSync(resolve(process.argv[1]));
    return process.platform === "win32" ? self.toLowerCase() === entry.toLowerCase() : self === entry;
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  const root = resolve(process.argv[2] ?? REPO_ROOT);
  const registryUrl = process.env.ATLAS_CURRENCY_REGISTRY_URL || REGISTRY_LATEST_URL;
  const siteUrl = process.env.ATLAS_CURRENCY_SITE_URL || SITE_INDEX_URL;
  console.log(`@urbankitstudio/atlas currency for ${root}`);
  console.log(`asking ${registryUrl} and ${siteUrl}`);
  console.log("");
  const verdicts = await run({ root, registryUrl, siteUrl });
  for (const line of render(verdicts)) console.log(line);
  const reds = verdicts.filter((v) => v.status === "red").length;
  const warns = verdicts.filter((v) => v.status === "warn").length;
  console.log("");
  console.log(
    reds
      ? `${reds} of ${verdicts.length} checks red`
      : warns
        ? `no check red, ${warns} warning${warns > 1 ? "s" : ""}`
        : `all ${verdicts.length} checks green: npm serves the data the site serves`,
  );
  process.exitCode = exitCodeFor(verdicts);
}
