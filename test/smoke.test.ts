import { describe, it, expect } from "vitest";
import {
  findCounty,
  findState,
  listStates,
  listCountiesByState,
  slugify,
  countySlugFromName,
  buildParcelLookupDeepLink,
  statePath,
  countyPath,
  atlas,
  atlasIndex,
} from "../src/index.js";

describe("@urbankitstudio/atlas smoke", () => {
  it("findCounty('illinois', 'kane-county') returns Kane with a PIN search field", () => {
    const kane = findCounty("illinois", "kane-county");
    expect(kane).toBeDefined();
    expect(kane!.county).toBe("Kane");
    expect(kane!.stateSlug).toBe("illinois");
    expect(kane!.endpoints.length).toBeGreaterThan(0);
    const fields = kane!.endpoints.flatMap((e) => e.searchFields);
    const pin = fields.find((f) => f.name === "PIN");
    expect(pin).toBeDefined();
    expect(pin!.searchable).toBe(true);
  });

  it("findCounty returns undefined for unknown county", () => {
    expect(findCounty("illinois", "not-a-real-county")).toBeUndefined();
    expect(findCounty("not-a-state", "kane-county")).toBeUndefined();
  });

  it("findState returns the populated illinois file", () => {
    const il = findState("illinois");
    expect(il).toBeDefined();
    expect(il!.stateName).toBe("Illinois");
    expect(il!.counties.length).toBeGreaterThan(0);
    expect(findState("not-a-state")).toBeUndefined();
  });

  it("listStates returns all 50 states from the index", () => {
    const states = listStates();
    expect(states.length).toBe(50);
    const il = states.find((s) => s.slug === "illinois");
    expect(il).toBeDefined();
    expect(il!.populated).toBe(true);
  });

  it("listCountiesByState returns counties for populated states", () => {
    const ilCounties = listCountiesByState("illinois");
    expect(ilCounties.length).toBeGreaterThan(0);
    expect(listCountiesByState("not-a-state")).toEqual([]);
  });

  it("atlas root export exposes byStateSlug Map and totals", () => {
    expect(atlas.byStateSlug).toBeInstanceOf(Map);
    expect(atlas.byStateSlug.has("illinois")).toBe(true);
    expect(atlas.totals.states).toBe(50);
    // Pinned on purpose - a literal catches the bundle shipping stale data.
    // Update BOTH on every data release. These sat at 155 while the data grew to
    // 170, red and unseen, because the root suite excludes packages/** and this
    // file only runs at prepublishOnly. A root-suite guard
    // (src/lib/__tests__/atlas-package-parity.test.ts) now asserts these literals
    // match the bundled index, so the drift is caught at every gate.
    expect(atlas.totals.counties).toBe(171);
    expect(atlas.totals.endpoints).toBe(174);
    expect(atlasIndex.version).toBeDefined();
  });

  it("every populated state in the index is registered in byStateSlug", () => {
    // Regression guard: v0.3.0 shipped 14 populated states whose data files
    // were bundled but never registered in POPULATED_STATES, so findState /
    // findCounty silently returned undefined for them. Pin full coverage.
    const populated = listStates().filter((s) => s.populated);
    for (const s of populated) {
      expect(atlas.byStateSlug.has(s.slug)).toBe(true);
    }
    // New Jersey was one of the previously-unregistered states.
    expect(findState("new-jersey")).toBeDefined();
    expect(listCountiesByState("new-jersey").length).toBeGreaterThan(0);
  });

  it("helpers: slugify and county slug rules", () => {
    expect(slugify("New York")).toBe("new-york");
    expect(countySlugFromName("Kane")).toBe("kane-county");
    expect(countySlugFromName("Orleans Parish")).toBe("orleans-parish");
    expect(statePath("illinois")).toBe("/parcel-atlas/illinois");
    expect(countyPath("illinois", "kane-county")).toBe(
      "/parcel-atlas/illinois/kane-county"
    );
  });

  it("buildParcelLookupDeepLink returns urbankitstudio.com URL with endpoint param", () => {
    const kane = findCounty("illinois", "kane-county")!;
    const link = buildParcelLookupDeepLink(kane.endpoints[0]);
    expect(link.startsWith("https://urbankitstudio.com/tools/parcel-lookup?")).toBe(
      true
    );
    expect(link).toContain("endpoint=");
  });
});
