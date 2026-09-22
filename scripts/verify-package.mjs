#!/usr/bin/env node
/**
 * Verify a packed @urbankitstudio/atlas before it can reach the registry.
 *
 * ONE implementation, called by BOTH ci.yml and publish.yml, and that is the
 * point rather than tidiness. An adversarial review of the first version found
 * the two workflows had drifted: ci.yml checked the county floor AND the file
 * count AND the README copy, publish.yml checked only the floor -- and since the
 * two trigger independently on a push to main, with no `needs:` between them,
 * ci.yml going red has no power to stop publish.yml. The weaker gate was the
 * only one that could actually block a release. Two copies of a check are two
 * checks, and the one that matters is always the weaker.
 *
 * Everything is asserted in JS, not shell, because the shell version failed
 * OPEN. Verified by running it: `node -p "require('./data/index.json').totals
 * .counties"` on an index whose `totals` exists but has no `counties` prints
 * the string "undefined" and exits 0 -- it does not throw. `[ "undefined" -lt
 * 100 ]` then errors with "integer expected", and inside an `if A || B` that
 * error is simply treated as a false clause, so the guard passes. A schema
 * drift that dropped the field defeated the only data check outright.
 *
 * Usage:  node scripts/verify-package.mjs <dir>
 * `<dir>` is the EXTRACTED TARBALL's package directory, never the working tree:
 * `files` and .npmignore decide what ships, and the working tree does not.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join, isAbsolute, relative } from "node:path";

const ROOT = resolve(process.argv[2] ?? ".");

const problems = [];
const notes = [];
const fail = (msg) => problems.push(msg);
const ok = (msg) => notes.push(msg);

/** A floor, not an exact count: the registry grows, so pinning the number here
 *  would fail on every real update. This exists to catch an EMPTY or TRUNCATED
 *  sync, which is the failure that would otherwise publish quietly. */
const MIN_COUNTIES = 100;
const MIN_STATE_FILES = 10;

/** Lifecycle scripts that may run during a publish. Anything outside this list
 *  is refused rather than trusted.
 *
 *  This is the mitigation for a gap the review found and this script does NOT
 *  otherwise close: `npm pack` and `npm publish` produce SEPARATE archives, and
 *  `prepublishOnly` runs only on publish. So the bytes verified here are not
 *  literally the bytes that ship, and a lifecycle script that rewrote files
 *  would slip past every check. Publishing the packed tarball directly would
 *  close it properly -- but npm's docs do not state whether provenance survives
 *  a pre-packed tarball publish, and provenance is the entire reason this
 *  package publishes from a public repo. Trading it away to fix a lower-tier
 *  risk would be a bad bargain, so the scripts are pinned instead. */
const ALLOWED_LIFECYCLE = new Map([
  ["prepublishOnly", "npm run typecheck && npm run test && npm run build"],
]);
const LIFECYCLE_KEYS = [
  "prepublishOnly", "prepack", "postpack", "prepare", "publish", "postpublish",
];

const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));

// ---------------------------------------------------------------- manifest --
let pkg;
try {
  pkg = readJson("package.json");
} catch (err) {
  console.error(`FATAL: cannot read package.json in ${ROOT} -- ${err.message}`);
  process.exit(1);
}

// ------------------------------------------------------------ entry points --
// npm checks none of these. A build that silently emits nothing publishes an
// installable package that resolves to no code, which surfaces only in a
// consumer's project.
for (const field of ["main", "module", "types"]) {
  const value = pkg[field];
  if (typeof value !== "string" || value === "") {
    fail(`package.json declares no ${field}`);
    continue;
  }
  // An absolute path would satisfy a bare `test -f` on the runner while being
  // absent from the tarball entirely.
  if (isAbsolute(value)) {
    fail(`package.json ${field} is an absolute path (${value}); it must be relative to the package`);
    continue;
  }
  const target = resolve(ROOT, value);
  const rel = relative(ROOT, target);
  if (rel.startsWith("..")) {
    fail(`package.json ${field} (${value}) resolves outside the package`);
  } else if (!existsSync(target) || !statSync(target).isFile()) {
    fail(`package.json ${field} points at ${value}, which is not in the package`);
  } else {
    ok(`${field} -> ${value}`);
  }
}

// --------------------------------------------------------- lifecycle hooks --
for (const key of LIFECYCLE_KEYS) {
  const script = pkg.scripts?.[key];
  if (script === undefined) continue;
  const allowed = ALLOWED_LIFECYCLE.get(key);
  if (allowed === undefined) {
    fail(`package.json defines a ${key} script, which is not on the allow-list: ${script}`);
  } else if (script !== allowed) {
    fail(`package.json ${key} is not the expected script.\n      expected: ${allowed}\n      found:    ${script}`);
  } else {
    ok(`${key} is the expected script`);
  }
}

// ---------------------------------------------------------------- the data --
// The data IS the product. An atlas package with no counties installs cleanly
// and answers nothing.
let index;
try {
  index = readJson("data/index.json");
} catch (err) {
  console.error(`FATAL: data/index.json is missing or unparseable in ${ROOT} -- ${err.message}`);
  console.error("This package would install with no atlas at all.");
  process.exit(1);
}

const int = (value, label) => {
  if (!Number.isInteger(value)) {
    fail(`${label} is ${JSON.stringify(value)}, not an integer -- the floor below cannot judge it`);
    return null;
  }
  return value;
};

const counties = int(index?.totals?.counties, "data/index.json totals.counties");
const endpoints = int(index?.totals?.endpoints, "data/index.json totals.endpoints");

if (counties !== null && counties < MIN_COUNTIES) {
  fail(`data/index.json reports ${counties} counties, below the ${MIN_COUNTIES} floor -- the sync looks truncated`);
}

const stateFiles = existsSync(join(ROOT, "data"))
  ? readdirSync(join(ROOT, "data")).filter((f) => f.endsWith(".json") && f !== "index.json")
  : [];
if (stateFiles.length < MIN_STATE_FILES) {
  fail(`data/ holds ${stateFiles.length} state files, below the ${MIN_STATE_FILES} floor`);
}

// 🔴 THE CROSS-CHECK NEITHER WORKFLOW HAD. A floor only reads what the index
// SAYS about itself, so a stale-but-large `totals.counties` sitting beside a
// truncated set of per-state files clears it. Three numbers have to agree: the
// declared total, the sum of the per-state counts the index lists, and the
// counties actually present in the files on disk.
if (Array.isArray(index?.states)) {
  const declared = index.states.reduce(
    (sum, s) => sum + (Number.isInteger(s?.countyCount) ? s.countyCount : 0), 0,
  );
  if (counties !== null && declared !== counties) {
    fail(`data/index.json disagrees with itself: totals.counties is ${counties}, but its states[] sum to ${declared}`);
  } else if (counties !== null) {
    ok(`index totals agree with its own states[] (${declared})`);
  }

  let actual = 0;
  for (const state of index.states) {
    const file = `${state?.slug}.json`;
    if (!existsSync(join(ROOT, "data", file))) {
      fail(`data/index.json lists state "${state?.slug}" but data/${file} is not in the package`);
      continue;
    }
    let body;
    try {
      body = readJson(`data/${file}`);
    } catch (err) {
      fail(`data/${file} is unparseable -- ${err.message}`);
      continue;
    }
    if (!Array.isArray(body?.counties)) {
      fail(`data/${file} has no counties array`);
      continue;
    }
    actual += body.counties.length;
    if (Number.isInteger(state?.countyCount) && body.counties.length !== state.countyCount) {
      fail(`data/${file} holds ${body.counties.length} counties, but the index says ${state.countyCount}`);
    }
  }
  if (counties !== null && actual !== counties) {
    fail(`the packaged state files hold ${actual} counties, but data/index.json claims ${counties}`);
  } else if (counties !== null) {
    ok(`${actual} counties present across ${stateFiles.length} state files, matching the index`);
  }
} else {
  fail("data/index.json has no states[] array, so the declared total cannot be cross-checked");
}

// ------------------------------------------------------------- the copy -----
// The README opening line and the npm description are the first thing a
// consumer reads, and both said 155 counties for two releases after the atlas
// reached 170.
if (counties !== null) {
  const phrase = `${counties} counties`;
  const description = typeof pkg.description === "string" ? pkg.description : "";
  if (!description.includes(phrase)) {
    fail(`package.json description does not state "${phrase}"`);
  } else {
    ok(`description states ${phrase}`);
  }
  const readmePath = join(ROOT, "README.md");
  if (!existsSync(readmePath)) {
    fail("README.md is not in the package");
  } else if (!readFileSync(readmePath, "utf8").includes(phrase)) {
    fail(`README.md does not state "${phrase}"`);
  } else {
    ok(`README.md states ${phrase}`);
  }
}

// ------------------------------------------------------------------ report --
console.log(`verifying ${ROOT}`);
console.log(`  version ${pkg.version} | counties ${counties} | endpoints ${endpoints} | state files ${stateFiles.length}`);
for (const note of notes) console.log(`  ok    ${note}`);
if (problems.length) {
  console.log("");
  for (const problem of problems) console.error(`::error::${problem}`);
  console.error(`\n${problems.length} problem(s); this package must not be published`);
  process.exit(1);
}
console.log(`\nall ${notes.length} checks passed`);
