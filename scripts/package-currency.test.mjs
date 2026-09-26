/**
 * Tests for scripts/check-package-currency.mjs. package-currency.yml runs this
 * file before the check itself, so a check that has stopped checking goes red
 * before it gets the chance to pass.
 *
 * node:test, not vitest, and in scripts/, not test/, on purpose. test/ and
 * vitest.config.ts arrive from the monorepo by the mirror sync (rsync
 * --delete), which would overwrite or delete anything this repo put there;
 * .github/ and scripts/ are the only paths the sync leaves alone. vitest
 * collects only the *.test.ts files under test/, so `npm test` never runs
 * this file, and tsconfig.json does not include scripts/.
 *
 * No network. The script runs end to end against a local server, and the
 * history walk runs against throwaway git repositories.
 *
 * Run: node --test scripts/package-currency.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  REMEDY,
  compareSemver,
  dataChangedSince,
  dataLagVerdict,
  findReleaseCommit,
  gitIn,
  indexFacts,
  publishLagVerdict,
  unbumpedDataVerdict,
} from "./check-package-currency.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const SCRIPT = join(HERE, "check-package-currency.mjs");
const WORKFLOW = join(REPO, ".github", "workflows", "package-currency.yml");
const TEST_CMD = "node --test scripts/package-currency.test.mjs";
const CHECK_CMD = "node scripts/check-package-currency.mjs";

// ------------------------------------------------------------------ semver --
test("compareSemver orders numerically, not lexically", () => {
  assert.equal(compareSemver("0.6.8", "0.6.8"), 0);
  assert.equal(compareSemver("0.10.0", "0.9.0"), 1);
  assert.equal(compareSemver("0.9.0", "0.10.0"), -1);
  assert.equal(compareSemver("1.0.0", "0.99.99"), 1);
  assert.equal(compareSemver("0.6.10", "0.6.9"), 1);
});

test("compareSemver ranks prereleases the way semver does", () => {
  assert.equal(compareSemver("1.0.0-rc.1", "1.0.0"), -1);
  assert.equal(compareSemver("1.0.0", "1.0.0-rc.1"), 1);
  assert.equal(compareSemver("1.0.0-alpha", "1.0.0-alpha.1"), -1);
  assert.equal(compareSemver("1.0.0-alpha.2", "1.0.0-alpha.10"), -1);
  assert.equal(compareSemver("1.0.0-1", "1.0.0-alpha"), -1);
  assert.equal(compareSemver("1.0.0-beta", "1.0.0-alpha"), 1);
  assert.equal(compareSemver("1.0.0+build.5", "1.0.0"), 0);
});

test("compareSemver refuses what it cannot parse instead of calling it equal", () => {
  for (const bad of ["0.6", "v0.6.8", "", undefined, null, "0.6.8\nrelease=true"]) {
    assert.throws(() => compareSemver(bad, "0.6.8"), /not a semver version/, `accepted ${JSON.stringify(bad)}`);
    assert.throws(() => compareSemver("0.6.8", bad), /not a semver version/, `accepted ${JSON.stringify(bad)}`);
  }
});

// ------------------------------------------------------------- PUBLISH LAG --
test("PUBLISH LAG: the same version on both sides is green", () => {
  const v = publishLagVerdict("0.6.8", "0.6.8");
  assert.equal(v.status, "ok", v.message);
  assert.equal(v.check, "PUBLISH LAG");
});

test("PUBLISH LAG: the repo ahead of npm means the publish did not happen", () => {
  const v = publishLagVerdict("0.6.9", "0.6.8");
  assert.equal(v.status, "red");
  assert.match(v.message, /the repo is AHEAD of npm, so the publish did not happen/);
});

test("PUBLISH LAG: npm ahead of the repo means the mirror lags, even where the strings sort the other way", () => {
  // As strings "0.6.8" > "0.10.0"; a lexical compare would blame the publish.
  const v = publishLagVerdict("0.6.8", "0.10.0");
  assert.equal(v.status, "red");
  assert.match(v.message, /npm is AHEAD of the repo, so this mirror lags the release/);
});

test("PUBLISH LAG: a version that cannot be parsed is red, never equal", () => {
  const v = publishLagVerdict("0.6.8", "latest");
  assert.equal(v.status, "red");
  assert.match(v.message, /cannot compare/);
});

// ---------------------------------------------------------------- DATA LAG --
const facts = (counties, endpoints, lastUpdated) => ({ counties, endpoints, lastUpdated });
const PACKAGED = facts(234, 246, "2026-09-26");
const VERSIONS = { repoVersion: "0.6.8", npmVersion: "0.6.8" };

test("DATA LAG: the same three facts on both sides are green", () => {
  const v = dataLagVerdict(PACKAGED, { ...PACKAGED }, VERSIONS);
  assert.equal(v.status, "ok", v.message);
});

for (const [field, live] of [
  ["counties", facts(235, 246, "2026-09-26")],
  ["endpoints", facts(234, 247, "2026-09-26")],
  ["lastUpdated", facts(234, 246, "2026-09-27")],
]) {
  test(`DATA LAG: the site ahead on ${field} alone is red`, () => {
    const v = dataLagVerdict(PACKAGED, live, VERSIONS);
    assert.equal(v.status, "red", v.message);
    assert.match(v.message, /the live site is AHEAD/);
    assert.match(v.message, new RegExp(`${field} \\(site `));
  });
}

test("DATA LAG: a red names both versions, so it says which release carries the old data", () => {
  const v = dataLagVerdict(PACKAGED, facts(235, 246, "2026-09-26"), { repoVersion: "0.6.8", npmVersion: "0.6.7" });
  assert.match(v.message, /This checkout is 0\.6\.8; npm latest is 0\.6\.7\./);
});

test("DATA LAG: the site behind the package warns and does not fail", () => {
  const v = dataLagVerdict(PACKAGED, facts(233, 245, "2026-09-25"), VERSIONS);
  assert.equal(v.status, "warn", v.message);
  assert.match(v.message, /TRAILS/);
});

test("DATA LAG: ahead on one fact and behind on another is still red", () => {
  const v = dataLagVerdict(PACKAGED, facts(233, 247, "2026-09-26"), VERSIONS);
  assert.equal(v.status, "red", v.message);
});

test("DATA LAG: a missing or malformed fact is red as cannot-judge, never equal", () => {
  const broken = indexFacts({ totals: { counties: "234" }, lastUpdated: "not a date" });
  assert.deepEqual(broken, { counties: null, endpoints: null, lastUpdated: null });
  const v = dataLagVerdict(PACKAGED, broken, VERSIONS);
  assert.equal(v.status, "red");
  assert.match(v.message, /cannot judge/);
});

test("indexFacts finds all three facts in this repo's real data/index.json", () => {
  const got = indexFacts(JSON.parse(readFileSync(join(REPO, "data", "index.json"), "utf8")));
  for (const field of ["counties", "endpoints", "lastUpdated"]) {
    assert.notEqual(got[field], null, `${field} is not where DATA LAG reads it; the index shape moved`);
  }
});

// ----------------------------------------------------------- UNBUMPED DATA --
test("UNBUMPED DATA: no data change since the release is green", () => {
  const v = unbumpedDataVerdict({ version: "0.6.8", releaseCommit: "8b9ac29e", changedFiles: [] });
  assert.equal(v.status, "ok", v.message);
});

test("UNBUMPED DATA: a data change after the release is red and names the remedy", () => {
  const v = unbumpedDataVerdict({ version: "0.6.6", releaseCommit: "595e9b6c", changedFiles: ["data/alaska.json"] });
  assert.equal(v.status, "red");
  assert.ok(v.message.includes("data/alaska.json"), v.message);
  assert.ok(v.message.includes(REMEDY), v.message);
  assert.equal(
    REMEDY,
    "bump packages/atlas version + CHANGELOG in the UKS monorepo; the mirror and the publish follow",
  );
});

// ------------------------------------------------------- the history walk --
/** A throwaway repository, isolated from this machine's git config so a
 *  global hook, signing rule or autocrlf setting cannot change what it
 *  records. */
function fixtureRepo() {
  const base = mkdtempSync(join(tmpdir(), "atlas-currency-"));
  const dir = join(base, "repo");
  mkdirSync(dir);
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: join(base, "no-gitconfig") };
  const git = (...args) =>
    execFileSync(
      "git",
      [
        "-C", dir,
        "-c", "user.name=fixture",
        "-c", "user.email=fixture@example.invalid",
        "-c", "commit.gpgsign=false",
        "-c", "core.autocrlf=false",
        ...args,
      ],
      { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] },
    );
  git("init", "-q");
  const write = (rel, value) => {
    const file = join(dir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  };
  const commit = (message) => {
    git("add", "-A");
    git("commit", "-q", "--no-verify", "-m", message);
    return git("rev-parse", "HEAD").trim();
  };
  const cleanup = () => {
    try {
      rmSync(base, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      // A temp directory the OS will reap; never a reason to fail a test.
    }
  };
  return { base, dir, env, write, commit, cleanup };
}

const index = (counties, endpoints, lastUpdated) => ({
  version: "0.3.0",
  lastUpdated,
  totals: { states: 1, counties, endpoints },
  states: [],
});

test("the history walk finds the commit that SET the version, not the last one to touch package.json", () => {
  const repo = fixtureRepo();
  try {
    repo.write("package.json", { name: "fixture", version: "1.0.0" });
    repo.write("data/a.json", { rows: 1 });
    repo.commit("first release");
    repo.write("package.json", { name: "fixture", version: "1.1.0" });
    repo.write("data/a.json", { rows: 2 });
    const release = repo.commit("1.1.0, with its data");
    repo.write("package.json", { name: "fixture", version: "1.1.0", description: "reworded" });
    repo.write("README.md", "docs only\n");
    repo.commit("description only, same version");

    const git = gitIn(repo.dir);
    assert.deepEqual(findReleaseCommit(git), { version: "1.1.0", releaseCommit: release });
    assert.deepEqual(dataChangedSince(git, release), [], "the release's own data counts as released");

    repo.write("data/a.json", { rows: 3 });
    repo.write("data/b.json", { rows: 1 });
    repo.commit("data moves, no bump");
    assert.deepEqual(dataChangedSince(git, release), ["data/a.json", "data/b.json"]);
    assert.equal(findReleaseCommit(git).releaseCommit, release);
  } finally {
    repo.cleanup();
  }
});

test("a shallow checkout is refused, not walked to its graft and passed", () => {
  const repo = fixtureRepo();
  try {
    repo.write("package.json", { name: "fixture", version: "1.0.0" });
    repo.commit("first release");
    repo.write("package.json", { name: "fixture", version: "1.1.0" });
    repo.commit("second release");
    repo.write("data/a.json", { rows: 1 });
    repo.commit("data moves, no bump");

    const shallow = join(repo.base, "shallow");
    execFileSync("git", ["clone", "-q", "--depth", "1", pathToFileURL(repo.dir).href, shallow], {
      env: repo.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.throws(() => findReleaseCommit(gitIn(shallow)), /shallow/);
    // The control: the full history of the same commits walks.
    assert.equal(findReleaseCommit(gitIn(repo.dir)).version, "1.1.0");
  } finally {
    repo.cleanup();
  }
});

// ------------------------------------------------------------ end to end --
/** Serves the two answers the script asks for; `answers` changes per case. */
async function localSources() {
  const answers = { registry: { status: 200, body: {} }, site: { status: 200, body: {} } };
  const server = createServer((req, res) => {
    const answer =
      req.url === "/registry" ? answers.registry : req.url === "/site" ? answers.site : { status: 404, body: "no route" };
    const isText = typeof answer.body === "string";
    res.writeHead(answer.status, { "content-type": isText ? "text/html" : "application/json" });
    res.end(isText ? answer.body : JSON.stringify(answer.body));
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address();
  return {
    answers,
    registryUrl: `http://127.0.0.1:${port}/registry`,
    siteUrl: `http://127.0.0.1:${port}/site`,
    close: () => new Promise((done) => server.close(done)),
  };
}

/** Executes the script the way the workflow does. Asynchronously, never with
 *  execFileSync: a blocked event loop could not answer the child's requests. */
function runScript(repoDir, sources, env) {
  return new Promise((done) => {
    execFile(
      process.execPath,
      [SCRIPT, repoDir],
      {
        encoding: "utf8",
        timeout: 60_000,
        env: { ...env, ATLAS_CURRENCY_REGISTRY_URL: sources.registryUrl, ATLAS_CURRENCY_SITE_URL: sources.siteUrl },
      },
      (err, stdout, stderr) => {
        done({ code: err ? (typeof err.code === "number" ? err.code : -1) : 0, stdout, stderr });
      },
    );
  });
}

test("executed directly, the script runs all three checks every time and exits by their verdicts", async () => {
  const repo = fixtureRepo();
  const sources = await localSources();
  try {
    repo.write("package.json", { name: "fixture", version: "1.0.0" });
    repo.write("data/index.json", index(10, 10, "2026-01-01"));
    repo.commit("first release");
    repo.write("package.json", { name: "fixture", version: "1.1.0" });
    repo.write("data/index.json", index(11, 12, "2026-02-01"));
    repo.commit("1.1.0, with its data");
    const show = (r) => `exit ${r.code}\n${r.stdout}${r.stderr}`;

    // Everything current: three ok lines, exit 0.
    sources.answers.registry = { status: 200, body: { name: "fixture", version: "1.1.0" } };
    sources.answers.site = { status: 200, body: index(11, 12, "2026-02-01") };
    let r = await runScript(repo.dir, sources, repo.env);
    assert.equal(r.code, 0, show(r));
    for (const check of ["PUBLISH LAG", "DATA LAG", "UNBUMPED DATA"]) {
      assert.match(r.stdout, new RegExp(`^ok    ${check}: `, "m"), show(r));
    }

    // The site behind the package: a warning line, and still exit 0.
    sources.answers.site = { status: 200, body: index(10, 10, "2026-01-01") };
    r = await runScript(repo.dir, sources, repo.env);
    assert.equal(r.code, 0, show(r));
    assert.match(r.stdout, /^::warning::DATA LAG: the live site TRAILS/m, show(r));

    // Neither source answers usefully: two could-not-ask reds, and the third
    // check still runs.
    sources.answers.registry = { status: 503, body: { error: "unavailable" } };
    sources.answers.site = { status: 200, body: "<html>a challenge page, not JSON</html>" };
    r = await runScript(repo.dir, sources, repo.env);
    assert.equal(r.code, 1, show(r));
    assert.match(r.stdout, /^::error::PUBLISH LAG: could not ask the npm registry/m, show(r));
    assert.match(r.stdout, /^::error::DATA LAG: could not ask the live site/m, show(r));
    assert.match(r.stdout, /^ok    UNBUMPED DATA: /m, show(r));

    // All three late at once: three reds from one run, exit 1.
    repo.write("data/index.json", index(11, 12, "2026-02-02"));
    repo.commit("data moves, no bump");
    sources.answers.registry = { status: 200, body: { name: "fixture", version: "1.2.0" } };
    sources.answers.site = { status: 200, body: index(12, 12, "2026-02-03") };
    r = await runScript(repo.dir, sources, repo.env);
    assert.equal(r.code, 1, show(r));
    assert.match(r.stdout, /^::error::PUBLISH LAG: npm latest is 1\.2\.0 but this checkout is 1\.1\.0/m, show(r));
    assert.match(r.stdout, /^::error::DATA LAG: the live site is AHEAD/m, show(r));
    assert.match(r.stdout, /^::error::UNBUMPED DATA: 1 file\(s\) under data\/ changed/m, show(r));
  } finally {
    await sources.close();
    repo.cleanup();
  }
});

// ---------------------------------------------------------- the workflow --
/** The workflow's code with comments removed: a check that matched the file's
 *  own prose would pass while the steps did nothing. */
function workflowCode() {
  return readFileSync(WORKFLOW, "utf8")
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|\s)#.*$/, "").trimEnd())
    .filter((line) => line.trim() !== "");
}

test("package-currency.yml runs this file, then the script, by these paths, and never on push", () => {
  assert.ok(existsSync(WORKFLOW), ".github/workflows/package-currency.yml is missing");
  const code = workflowCode();

  const onAt = code.findIndex((line) => /^on:\s*$/.test(line));
  assert.notEqual(onAt, -1, "no top-level `on:` block");
  const triggers = [];
  for (const line of code.slice(onAt + 1)) {
    if (/^\S/.test(line)) break;
    const m = /^ {2}([A-Za-z_]+):/.exec(line);
    if (m) triggers.push(m[1]);
  }
  assert.deepEqual(
    triggers.sort(),
    ["schedule", "workflow_dispatch"],
    "a check that needs the network must never run on push or pull_request",
  );

  const runs = code.map((line) => /^\s*(?:-\s+)?run:\s*(.+)$/.exec(line)?.[1].trim()).filter(Boolean);
  assert.ok(runs.includes(TEST_CMD), `no step runs \`${TEST_CMD}\`; steps run: ${JSON.stringify(runs)}`);
  assert.ok(runs.includes(CHECK_CMD), `no step runs \`${CHECK_CMD}\`; steps run: ${JSON.stringify(runs)}`);
  assert.ok(runs.indexOf(TEST_CMD) < runs.indexOf(CHECK_CMD), "the tests must run before the check");
  for (const cmd of [TEST_CMD, CHECK_CMD]) {
    const rel = cmd.split(" ").at(-1);
    assert.ok(existsSync(join(REPO, rel)), `the workflow runs ${rel}, which does not exist`);
  }
  assert.ok(
    !runs.some((cmd) => /\bnpm\s+(ci|install|i)\b/.test(cmd)),
    "no dependency install: the check uses node builtins only",
  );
  assert.ok(
    code.some((line) => /^\s*fetch-depth:\s*0\s*$/.test(line)),
    "UNBUMPED DATA walks the history, so the checkout needs fetch-depth: 0",
  );
  assert.ok(
    !code.some((line) => line.includes("ATLAS_CURRENCY_")),
    "the workflow must ask the real registry and site, never the test seams",
  );
});
