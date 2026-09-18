/**
 * Edge-case coverage for findCountyByFips(). Mirrors test/findCounty.edge.test.ts
 * for the FIPS-lookup path: a real known county FIPS, an unmatched-but-valid
 * FIPS, and the malformed-input contract (non-5-digit, empty, non-numeric).
 *
 * Note on input contract: countyFips is the full 5-digit code (state FIPS +
 * county FIPS, e.g. "17089" = Kane County, IL). Leading zeros are significant
 * and stored as strings ("01073" = Jefferson County, AL), so the SDK matches
 * on the exact string and rejects anything that isn't exactly five digits —
 * pinned below so a future refactor can't loosen the contract silently.
 */

import { describe, it, expect } from "vitest";
import { findCountyByFips } from "../src/index.js";

describe("findCountyByFips edge cases", () => {
  it("returns Kane county for its real FIPS code 17089", () => {
    const kane = findCountyByFips("17089");
    expect(kane).toBeDefined();
    expect(kane!.county).toBe("Kane");
    expect(kane!.stateSlug).toBe("illinois");
  });

  it("matches a leading-zero FIPS string (01073 → Jefferson County, AL)", () => {
    // Pins string-exact matching: "01073" must not be normalised to 1073.
    const jefferson = findCountyByFips("01073");
    expect(jefferson).toBeDefined();
    expect(jefferson!.stateSlug).toBe("alabama");
    expect(jefferson!.countyFips).toBe("01073");
  });

  it("returns a full CountyRecord shape for a matched FIPS", () => {
    const kane = findCountyByFips("17089")!;
    expect(typeof kane.id).toBe("string");
    expect(typeof kane.county).toBe("string");
    expect(typeof kane.countySlug).toBe("string");
    expect(kane.countyFips).toBe("17089");
    expect(typeof kane.stateName).toBe("string");
    expect(typeof kane.stateSlug).toBe("string");
    expect(Array.isArray(kane.endpoints)).toBe(true);
    expect(typeof kane.hasPublicRest).toBe("boolean");
  });

  it("returns undefined for a well-formed but unmatched FIPS", () => {
    expect(findCountyByFips("99999")).toBeUndefined();
    expect(findCountyByFips("00000")).toBeUndefined();
  });

  it("returns undefined for non-5-digit input (never throws)", () => {
    expect(findCountyByFips("1708")).toBeUndefined(); // too short
    expect(findCountyByFips("170899")).toBeUndefined(); // too long
    expect(findCountyByFips("")).toBeUndefined();
    expect(findCountyByFips("abcde")).toBeUndefined();
    expect(findCountyByFips("170-89")).toBeUndefined();
    expect(findCountyByFips(" 17089")).toBeUndefined(); // whitespace
    expect(findCountyByFips("17089 ")).toBeUndefined();
  });

  it("tolerates non-string input without throwing", () => {
    // Defensive: JS callers may pass through untyped values. Must return
    // undefined, never throw.
    expect(findCountyByFips(undefined as unknown as string)).toBeUndefined();
    expect(findCountyByFips(null as unknown as string)).toBeUndefined();
    expect(findCountyByFips(17089 as unknown as string)).toBeUndefined();
  });
});
