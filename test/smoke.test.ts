import { describe, it, expect } from "vitest";
import {
  findCounty,
  findState,
  listStates,
  listCountiesByState,
  slugify,
  countySlugFromName,
  buildParcelLookupDeepLink,
  canonicalLayerUrl,
  offersAttributeSearch,
  countyOffersAttributeSearch,
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

  it("listStates returns all 50 states and DC from the index", () => {
    const states = listStates();
    expect(states.length).toBe(51);
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
    expect(atlas.totals.states).toBe(51);
    // Pinned on purpose - a literal catches the bundle shipping stale data.
    // Update BOTH on every data release. These sat at 155 while the data grew to
    // 170, red and unseen, because the root suite excludes packages/** and this
    // file only runs at prepublishOnly. A root-suite guard
    // (src/lib/__tests__/atlas-package-parity.test.ts) now asserts these literals
    // match the bundled index, so the drift is caught at every gate.
    expect(atlas.totals.counties).toBe(277);
    expect(atlas.totals.endpoints).toBe(288);
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
    expect(countySlugFromName("District of Columbia")).toBe("district-of-columbia");
    expect(countySlugFromName("Anchorage Municipality")).toBe("anchorage-municipality");
    expect(findCounty("district-of-columbia", "district-of-columbia")?.countyFips).toBe("11001");
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

  // #905. The controls for the cases below: an unflagged single-county layer
  // keeps the generic link, with its owner fieldHint when the owner rule
  // matches a column (Harris: owner_name_1; Kane's TaxName does not match it),
  // with or without a county argument.
  it("buildParcelLookupDeepLink: an unflagged single-county layer keeps the generic link and its fieldHint", () => {
    for (const [stateSlug, countySlug, hint] of [
      ["texas", "harris-county", "owner_name_1"],
      ["illinois", "kane-county", null],
    ] as const) {
      const county = findCounty(stateSlug, countySlug)!;
      const ep = county.endpoints[0];
      expect(offersAttributeSearch(ep)).toBe(true);
      expect(ep.scopeWhere).toBeUndefined();
      for (const link of [buildParcelLookupDeepLink(ep), buildParcelLookupDeepLink(ep, undefined, county)]) {
        const url = new URL(link);
        expect(url.pathname).toBe("/tools/parcel-lookup");
        expect(url.searchParams.get("endpoint")).toBe(ep.url);
        expect(url.searchParams.get("fieldHint")).toBe(hint);
      }
    }
  });

  it("buildParcelLookupDeepLink: a flagged FDOR layer goes to the county route given a county", () => {
    const alachua = findCounty("florida", "alachua-county")!;
    const ep = alachua.endpoints[0];
    expect(offersAttributeSearch(ep)).toBe(false);
    const generic = new URL(buildParcelLookupDeepLink(ep));
    expect(generic.searchParams.get("endpoint")).toBe(ep.url);
    // FDOR's owner column is OWN_NAME, which the owner rule never matched, so
    // this layer had no fieldHint before #905 either. Orleans, below, is the
    // case that proves a flagged layer's fieldHint is dropped.
    expect(generic.searchParams.has("fieldHint")).toBe(false);
    expect(buildParcelLookupDeepLink(ep, undefined, alachua)).toBe(
      "https://urbankitstudio.com/tools/parcel-lookup/florida/alachua-county"
    );
  });

  it("buildParcelLookupDeepLink: Orleans drops its owner fieldHint, and goes to the county route though unscoped", () => {
    const orleans = findCounty("louisiana", "orleans-parish")!;
    const ep = orleans.endpoints[0];
    expect(ep.scopeWhere).toBeUndefined();
    // OWNERNME1 matches the owner rule, so before #905 this link carried
    // fieldHint=OWNERNME1 and pre-selected an owner search that never answers.
    expect(ep.searchFields.some((f) => f.name === "OWNERNME1")).toBe(true);
    expect(new URL(buildParcelLookupDeepLink(ep)).searchParams.has("fieldHint")).toBe(false);
    expect(buildParcelLookupDeepLink(ep, "/tools/parcel-lookup", orleans)).toBe(
      "/tools/parcel-lookup/louisiana/orleans-parish"
    );
  });

  it("buildParcelLookupDeepLink: an unflagged SHARED layer goes to the county route, which scopes it", () => {
    const kings = findCounty("new-york", "kings-county")!;
    const ep = kings.endpoints.find((e) => e.scopeWhere)!;
    expect(offersAttributeSearch(ep)).toBe(true);
    expect(buildParcelLookupDeepLink(ep, undefined, kings)).toBe(
      "https://urbankitstudio.com/tools/parcel-lookup/new-york/kings-county"
    );
  });

  // The county route always loads county.endpoints[0], so only that endpoint
  // may be sent there. Broward is one of ten Florida counties whose primary is
  // the county's own layer and whose flagged FDOR layer is second.
  it("buildParcelLookupDeepLink: Broward's flagged FDOR secondary keeps a generic link to itself, with no fieldHint", () => {
    const broward = findCounty("florida", "broward-county")!;
    const fdor = broward.endpoints[1];
    expect(offersAttributeSearch(fdor)).toBe(false);
    expect(canonicalLayerUrl(fdor.url)).not.toBe(canonicalLayerUrl(broward.endpoints[0].url));
    const url = new URL(buildParcelLookupDeepLink(fdor, undefined, broward));
    expect(url.pathname).toBe("/tools/parcel-lookup");
    expect(url.searchParams.get("endpoint")).toBe(fdor.url);
    expect(url.searchParams.has("fieldHint")).toBe(false);
  });

  it("buildParcelLookupDeepLink: Broward's own primary layer keeps its unchanged generic link", () => {
    const broward = findCounty("florida", "broward-county")!;
    const own = broward.endpoints[0];
    expect(offersAttributeSearch(own)).toBe(true);
    expect(own.scopeWhere).toBeUndefined();
    expect(buildParcelLookupDeepLink(own, undefined, broward)).toBe(buildParcelLookupDeepLink(own));
  });

  it("buildParcelLookupDeepLink: Kings' second scoped layer (NYS, not MapPLUTO) keeps the generic link it had before #905", () => {
    const kings = findCounty("new-york", "kings-county")!;
    const [pluto, nys] = kings.endpoints;
    expect(pluto.scopeWhere).toBeDefined();
    expect(nys.scopeWhere).toBeDefined();
    expect(canonicalLayerUrl(nys.url)).not.toBe(canonicalLayerUrl(pluto.url));
    expect(buildParcelLookupDeepLink(pluto, undefined, kings)).toBe(
      "https://urbankitstudio.com/tools/parcel-lookup/new-york/kings-county"
    );
    expect(buildParcelLookupDeepLink(nys, undefined, kings)).toBe(buildParcelLookupDeepLink(nys));
  });

  it("buildParcelLookupDeepLink: a county passed without endpoints is taken as vouching for the endpoint", () => {
    const fdor = findCounty("florida", "broward-county")!.endpoints[1];
    expect(
      buildParcelLookupDeepLink(fdor, undefined, { stateSlug: "florida", countySlug: "broward-county" })
    ).toBe("https://urbankitstudio.com/tools/parcel-lookup/florida/broward-county");
  });

  it("buildParcelLookupDeepLink: Kane with its county is byte-identical to the link before #905", () => {
    const kane = findCounty("illinois", "kane-county")!;
    // The literal main's helper returns for this endpoint.
    expect(buildParcelLookupDeepLink(kane.endpoints[0], undefined, kane)).toBe(
      "https://urbankitstudio.com/tools/parcel-lookup?endpoint=https%3A%2F%2Fgistech.countyofkane.org%2Farcgis%2Frest%2Fservices%2FKanePINList%2FMapServer%2F0"
    );
  });

  it("canonicalLayerUrl: spellings of one layer meet, neighbouring layer ids do not", () => {
    const k = canonicalLayerUrl("https://gis.nola.gov/arcgis/rest/services/apps/property3/MapServer/15");
    expect(k).toBe("gis.nola.gov/arcgis/rest/services/apps/property3/mapserver/15");
    expect(canonicalLayerUrl("http://GIS.nola.gov:80/arcgis//rest/services/apps/./property3/MapServer/15/query?f=json#x")).toBe(k);
    expect(canonicalLayerUrl("https://gis.nola.gov:443/arcgis/rest/services/apps/property3/MapServer/15/")).toBe(k);
    expect(canonicalLayerUrl("https://gis.nola.gov/arcgis/rest/services/apps/property3/MapServer/1")).not.toBe(k);
    expect(canonicalLayerUrl("https://gis.nola.gov/arcgis/rest/services/apps/property3/MapServer/150")).not.toBe(k);
    expect(canonicalLayerUrl(" Not A URL/ ")).toBe("not a url");
  });

  it("countyOffersAttributeSearch: Miami-Dade's own layer is searchable though its FDOR layer is not", () => {
    const md = findCounty("florida", "miami-dade-county")!;
    expect(md.endpoints.map(offersAttributeSearch)).toEqual([true, false]);
    expect(countyOffersAttributeSearch(md)).toBe(true);
    expect(countyOffersAttributeSearch(findCounty("florida", "alachua-county")!)).toBe(false);
  });
});
