/**
 * The README's coverage numbers, checked against the data this package ships.
 *
 * This file exists because the claim has now been wrong twice. It said "every
 * state is now populated with at least one verified county endpoint" while five
 * counties published none, and the first correction said "all but three", which
 * was also wrong. Prose and data drift apart silently: nothing fails, the
 * package publishes, and the wrong number reaches npm, Socket and every reader.
 *
 * The index already carries the right field. `totals.countiesWithEndpoint`
 * exists precisely for this, and its own doc comment records an earlier round of
 * the same mistake ("Those two coincided at 155/155 while four counties
 * published none, which is how published copy came to claim 155 verified
 * endpoints"). The field was there and the README still got it wrong, because
 * using it was a convention rather than a check. This is the check.
 *
 * Failing here means the README and the data disagree. Fix whichever is wrong,
 * in the same change.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { atlas } from "../src/data.js";

const README = readFileSync(
  fileURLToPath(new URL("../README.md", import.meta.url)),
  "utf8",
);

/**
 * Pull one number out of the README, and fail loudly if the sentence it lives
 * in has been reworded. A quiet no-match would turn this whole file into
 * decoration: every assertion would pass against an empty string.
 */
function stated(label: string, pattern: RegExp): number[] {
  const hits = [...README.matchAll(new RegExp(pattern.source, pattern.flags + "g"))];
  expect(
    hits.length,
    `README no longer states ${label} where this test looks for it (/${pattern.source}/). ` +
      `The numbers are load-bearing, so reword the README and this pattern together.`,
  ).toBe(1);
  return hits[0].slice(1).map(Number);
}

describe("README coverage numbers match the shipped data", () => {
  it("states the county, state and endpoint totals the index reports", () => {
    const [counties, states] = stated(
      "the county/state headline",
      /\*\*(\d+) counties across all (\d+) US states\*\*/,
    );
    const [endpoints] = stated("the endpoint count", /\((\d+) verified endpoints\)/);

    expect(counties).toBe(atlas.totals.counties);
    expect(states).toBe(atlas.totals.states);
    expect(endpoints).toBe(atlas.totals.endpoints);
  });

  it("states how many counties are actually queryable, not just indexed", () => {
    const [withEndpoint, outOf] = stated(
      "the queryable-county sentence",
      /(\d+) of the (\d+) carry a verified endpoint/,
    );
    const [without] = stated(
      "the endpoint-less county count",
      /other (\d+) have `hasPublicRest: false`/,
    );

    expect(withEndpoint).toBe(atlas.totals.countiesWithEndpoint);
    expect(outOf).toBe(atlas.totals.counties);
    // The two halves must also add up, or the paragraph contradicts itself.
    expect(withEndpoint + without).toBe(atlas.totals.counties);
  });
});

describe("hasPublicRest is exact, which is what makes the README safe to say so", () => {
  // atlas.states carries per-state index SUMMARIES; the county records live in
  // the state files behind byStateSlug.
  const all = [...atlas.byStateSlug.values()].flatMap((s) => s.counties);

  it("is present on every county", () => {
    const missing = all.filter((c) => typeof c.hasPublicRest !== "boolean");
    expect(missing.map((c) => c.id)).toEqual([]);
  });

  it("agrees with endpoints[] in both directions", () => {
    const disagree = all
      .filter((c) => c.hasPublicRest !== (c.endpoints.length > 0))
      .map((c) => `${c.id}: hasPublicRest=${c.hasPublicRest} endpoints=${c.endpoints.length}`);
    expect(disagree).toEqual([]);
  });

  it("counts the same counties the index totals do", () => {
    expect(all.filter((c) => c.endpoints.length > 0).length).toBe(
      atlas.totals.countiesWithEndpoint,
    );
    expect(all.length).toBe(atlas.totals.counties);
  });
});
