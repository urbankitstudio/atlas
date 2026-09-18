/**
 * Edge-case coverage for findCounty() / findState(). Extends the smoke suite
 * in test/smoke.test.ts with the failure paths and lookup-by-slug variants
 * that callers most often get wrong (e.g. passing "kane" without the
 * "-county" suffix, or passing a state abbreviation instead of the slug).
 *
 * Note on input contract: the SDK takes state SLUGS ("illinois", "new-york"),
 * not state abbreviations. Callers occasionally try findCounty("IL", "kane")
 * and the SDK correctly returns undefined for those — the test below pins
 * that behaviour so a future refactor can't silently start accepting
 * either form (which would break consumers depending on the strict contract).
 */

import { describe, it, expect } from "vitest";
import { findCounty, findState, countySlugFromName } from "../src/index.js";

describe("findCounty edge cases", () => {
  it("returns Kane county when called with the canonical slug", () => {
    const kane = findCounty("illinois", "kane-county");
    expect(kane).toBeDefined();
    expect(kane!.county).toBe("Kane");
  });

  it("returns undefined when called with the bare county name (no '-county' suffix)", () => {
    // This pins the strict-slug contract — callers must run their input
    // through countySlugFromName() before calling findCounty. The atlas
    // page's URL params are already slugified, so this is the safer default.
    expect(findCounty("illinois", "kane")).toBeUndefined();
  });

  it("normalisation example: countySlugFromName('Kane') round-trips to a valid lookup", () => {
    // Documents the canonical pattern: take a raw county name from a user
    // input, normalise it, then look up.
    const slug = countySlugFromName("Kane");
    expect(slug).toBe("kane-county");
    expect(findCounty("illinois", slug)).toBeDefined();
  });

  it("returns undefined for an unknown state slug", () => {
    expect(findCounty("XX", "fake")).toBeUndefined();
    expect(findCounty("not-a-state", "kane-county")).toBeUndefined();
  });

  it("returns undefined for an unknown county within a valid state", () => {
    expect(findCounty("illinois", "fakecounty")).toBeUndefined();
    expect(findCounty("illinois", "not-a-real-county")).toBeUndefined();
  });

  it("is case-sensitive on state slug — capitalised slug yields undefined", () => {
    // This pins the case-sensitive lookup contract. If we ever want case-
    // insensitive matching we'd need to lower-case the input first and
    // update this test deliberately.
    expect(findCounty("Illinois", "kane-county")).toBeUndefined();
    expect(findCounty("ILLINOIS", "kane-county")).toBeUndefined();
  });

  it("is case-sensitive on county slug — capitalised slug yields undefined", () => {
    expect(findCounty("illinois", "Kane-County")).toBeUndefined();
    expect(findCounty("illinois", "KANE-COUNTY")).toBeUndefined();
  });
});

describe("findState edge cases", () => {
  it("returns the Illinois state file with counties for the valid slug", () => {
    const il = findState("illinois");
    expect(il).toBeDefined();
    expect(il!.stateName).toBe("Illinois");
    expect(il!.counties.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown state slug", () => {
    expect(findState("not-a-state")).toBeUndefined();
    expect(findState("")).toBeUndefined();
  });

  it("returns undefined when the slug is the state abbreviation", () => {
    // The SDK uses slugs, not abbrevs — pinned for consumer contract.
    expect(findState("IL")).toBeUndefined();
    expect(findState("il")).toBeUndefined();
  });
});
