/**
 * The city export: every indexed city resolves, references resolve the way the
 * hosted MCP tool resolves them, the URLs carry the site's injection guard and
 * the split-address clause, and nothing in here touches the network.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCityQuery,
  cityDatasets,
  citiesForCounty,
  cityPath,
  cityPropertyIndex,
  cityZoningIndex,
  findCity,
  findCityIn,
  getCityProperty,
  getCityZoning,
  listCities,
  mergeCityIndexes,
  propertyQueryUrl,
  splitAddressStreetName,
  splitStreet,
  streetForDataset,
  type CitySummary,
  type PropertyDataset,
} from "../src/index.js";

const fetchSpy = vi.fn(() => {
  throw new Error("the package must never fetch");
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("every populated index slug resolves", () => {
  it("property", () => {
    const populated = cityPropertyIndex.cities.filter((c) => c.populated);
    expect(populated.length).toBeGreaterThan(0);
    for (const c of populated) {
      const rec = getCityProperty(c.slug);
      expect(rec, c.slug).toBeDefined();
      expect(rec!.slug).toBe(c.slug);
      // The index carries the file's dataset kinds, so a reader with only the
      // index (the hosted MCP's city list) states them truthfully.
      expect(c.datasets, `${c.slug} index datasets`).toEqual(Object.keys(rec!.datasets));
    }
  });

  it("zoning", () => {
    const populated = cityZoningIndex.cities.filter((c) => c.populated);
    expect(populated.length).toBeGreaterThan(0);
    for (const c of populated) {
      const rec = getCityZoning(c.slug);
      expect(rec, c.slug).toBeDefined();
      expect(rec!.slug).toBe(c.slug);
    }
  });

  it("unknown and prototype-shaped slugs resolve to nothing", () => {
    expect(getCityProperty("not-a-city")).toBeUndefined();
    expect(getCityZoning("constructor")).toBeUndefined();
    expect(getCityProperty("__proto__")).toBeUndefined();
    expect(cityDatasets("not-a-city")).toEqual([]);
  });
});

describe("findCity", () => {
  it("by slug, by name, by 'Name, ST' and by alias", () => {
    expect(findCity("fort-worth").map((c) => c.slug)).toEqual(["fort-worth"]);
    expect(findCity("Fort Worth").map((c) => c.slug)).toEqual(["fort-worth"]);
    expect(findCity("Fort Worth, TX").map((c) => c.slug)).toEqual(["fort-worth"]);
    expect(findCity("fort worth", "Texas").map((c) => c.slug)).toEqual(["fort-worth"]);
    expect(findCity("NYC").map((c) => c.slug)).toEqual(["nyc"]);
    expect(findCity("New York City").map((c) => c.slug)).toEqual(["nyc"]);
    expect(findCity("DC").map((c) => c.slug)).toEqual(["washington-dc"]);
    expect(findCity("Washington, D.C.").map((c) => c.slug)).toEqual(["washington-dc"]);
    // The zoning registry's name for the same slug matches too.
    expect(findCity("Washington").map((c) => c.slug)).toEqual(["washington-dc"]);
    expect(findCity("New York").map((c) => c.slug)).toEqual(["nyc"]);
  });

  it("a wrong state empties the match and 'LA' is not an alias", () => {
    expect(findCity("Fort Worth", "CA")).toEqual([]);
    expect(findCity("LA")).toEqual([]);
    expect(findCity("")).toEqual([]);
    expect(findCity("../atlas/index")).toEqual([]);
  });

  it("the display name is the property registry's when both registries list the city", () => {
    const [dc] = findCity("washington-dc");
    expect(dc.city).toBe("Washington, DC");
    expect(dc.names).toContain("Washington");
    expect(dc.kinds).toEqual(["permits", "zoning"]);
  });

  it("ambiguity is a list, which the state narrows (pure fixture)", () => {
    const two: CitySummary[] = mergeCityIndexes(
      [
        { slug: "columbus-oh", city: "Columbus", state: "Ohio", stateAbbrev: "OH", populated: true, provider: "x", datasets: ["permits"] },
        { slug: "columbus-ga", city: "Columbus", state: "Georgia", stateAbbrev: "GA", populated: true, provider: "x", datasets: ["violations"] },
        { slug: "nowhere", city: "Nowhere", state: "Ohio", stateAbbrev: "OH", populated: false, provider: "x" },
      ],
      [{ slug: "columbus-ga", city: "Columbus", state: "Georgia", stateAbbrev: "GA", populated: true, provider: "x" }],
    );
    expect(two.map((c) => c.slug)).toEqual(["columbus-ga", "columbus-oh"]);
    expect(two[0].kinds).toEqual(["violations", "zoning"]);
    expect(findCityIn(two, "Columbus").map((c) => c.slug)).toEqual(["columbus-ga", "columbus-oh"]);
    expect(findCityIn(two, "Columbus", "GA").map((c) => c.slug)).toEqual(["columbus-ga"]);
    expect(findCityIn(two, "Columbus, Ohio").map((c) => c.slug)).toEqual(["columbus-oh"]);
    // A slug is an identity, never ambiguous.
    expect(findCityIn(two, "columbus-oh").map((c) => c.slug)).toEqual(["columbus-oh"]);
    expect(findCityIn(two, "Nowhere")).toEqual([]);
  });
});

describe("listCities and citiesForCounty", () => {
  it("filters by kind, state and county", () => {
    const all = listCities();
    expect(all.length).toBeGreaterThanOrEqual(20);
    expect(all.map((c) => c.slug)).toEqual([...all.map((c) => c.slug)].sort());
    const zoning = listCities({ kind: "zoning" });
    expect(zoning.length).toBe(cityZoningIndex.cities.filter((c) => c.populated).length);
    expect(zoning.every((c) => c.kinds.includes("zoning"))).toBe(true);
    const permitsOnly = listCities({ kind: "permits" }).map((c) => c.slug);
    expect(permitsOnly).toContain("phoenix");
    expect(listCities({ kind: "violations" }).map((c) => c.slug)).not.toContain("phoenix");
    expect(listCities({ state: "TX" }).map((c) => c.slug)).toEqual(["austin", "dallas", "fort-worth", "san-antonio"]);
    expect(listCities({ state: "texas" }).length).toBe(4);
    expect(listCities({ countySlug: "maricopa-county" }).map((c) => c.slug)).toEqual(["mesa", "phoenix", "scottsdale"]);
  });

  it("resolves an atlas county to its cities, and a returned list is a copy", () => {
    expect(citiesForCounty("arizona", "maricopa-county").map((c) => c.slug)).toEqual(["mesa", "phoenix", "scottsdale"]);
    expect(citiesForCounty("texas", "dallas-county").map((c) => c.slug)).toEqual(["dallas"]);
    expect(citiesForCounty("california", "orange-county")).toEqual([]);
    const [a] = listCities({ state: "AZ" });
    a.kinds.push("zoning");
    expect(listCities({ state: "AZ" })[0].kinds).not.toContain("zoning");
  });

  it("cityPath points at the site's pages", () => {
    expect(cityPath("dallas", "permits")).toBe("/tools/property-report/dallas");
    expect(cityPath("dallas", "violations")).toBe("/tools/property-report/dallas");
    expect(cityPath("dallas", "zoning")).toBe("/tools/zoning-cases/dallas");
  });
});

describe("dataset descriptors and queries", () => {
  it("Dallas publishes violations, permits and a current-zoning map", () => {
    const ds = cityDatasets("dallas");
    expect(ds.map((d) => d.kind)).toEqual(["violations", "permits", "zoning"]);
    expect(ds.every((d) => d.corsEnabled === true)).toBe(true);
    expect(ds.every((d) => d.citySlug === "dallas")).toBe(true);
    expect(cityDatasets("dallas", "permits").map((d) => d.kind)).toEqual(["permits"]);
    const permits = ds[1];
    expect(permits.provider).toBe("socrata");
    expect(permits.lookup).toBe("address");
    expect(permits.addressField).toBe("street_address");
    expect(permits.freshness.lastVerified).toBe(getCityProperty("dallas")!.lastVerified);
    // An address lookup has no template: a street has to be escaped for the
    // provider's SQL, so it goes through buildCityQuery, never a paste-in.
    expect(permits.queryTemplate).toBeNull();
    expect(permits.queryNote).toContain("'%' matches any run of characters");
    expect(permits.sampleQuery).toBe(buildCityQuery(permits, ""));
    const zoning = ds[2];
    expect(zoning.zoningMode).toBe("current-zoning");
    expect(zoning.lookup).toBe("location");
    expect(zoning.queryTemplate!.substitute).toBe("{LON},{LAT}");
    expect(zoning.sampleQuery).toBeNull();
    expect(buildCityQuery(zoning, "Commerce")).toBeNull();
  });

  it("doubles a quote in the street (O'Farrell), the site's injection guard", () => {
    const [violations] = cityDatasets("san-francisco", "violations");
    // San Francisco splits the address ([street_number, street_name, street_suffix], the
    // name column holds "Ofarrell"), so the type comes off and the quote is still doubled.
    const url = buildCityQuery(violations, "O'Farrell St")!;
    expect(decodeURIComponent(url)).toContain("%O''Farrell%");
    expect(decodeURIComponent(url)).not.toContain("%O'Farrell%");
    expect(decodeURIComponent(url)).not.toContain("Farrell St");
    const [cases] = cityDatasets("austin", "zoning");
    expect(decodeURIComponent(buildCityQuery(cases, "O'Brien")!)).toContain("upper('%O''Brien%')");
    // ...and the address docket carries no template either, for the same reason.
    expect(cases.lookup).toBe("address");
    expect(cases.queryTemplate).toBeNull();
  });

  it("a location docket has no street URL but a point template; a parcel docket browses only", () => {
    const [denver] = cityDatasets("denver", "zoning");
    expect(denver.lookup).toBe("location");
    expect(buildCityQuery(denver, "Colfax")).toBeNull();
    expect(buildCityQuery(denver, "")).toContain("/query?where=");
    expect(denver.queryTemplate!.params.geometry).toBe("{LON},{LAT}");
    expect(denver.queryTemplate!.params.spatialRel).toBe("esriSpatialRelIntersects");
    // The params map has no prototype, so a parameter named __proto__ could only ever be an own key.
    expect(Object.getPrototypeOf(denver.queryTemplate!.params)).toBeNull();
    const [nyc] = cityDatasets("nyc", "zoning");
    expect(nyc.lookup).toBe("parcel");
    expect(nyc.queryTemplate).toBeNull();
    expect(nyc.sampleQuery).toContain("hgx4-8ukb.json");
    expect(nyc.queryNote).toContain("geosearch.planninglabs.nyc");
    expect(buildCityQuery(nyc, "Broadway")).toBeNull();
  });

  it("the split-address clause engages only when streetNumber is mapped and the street has a number", () => {
    const base = getCityProperty("dallas")!.datasets.violations!;
    const split: PropertyDataset = {
      ...base,
      fields: { ...base.fields, streetNumber: "str_num" },
    };
    const url = decodeURIComponent(propertyQueryUrl(split, "1422 N Western Ave"));
    expect(url).toContain("upper(str_nam) like upper('%Western%') AND str_num = '1422'");
    // A numeric column drops the quotes.
    const numeric = decodeURIComponent(propertyQueryUrl({ ...split, streetNumberType: "number" }, "1422 N Western Ave"));
    expect(numeric).toContain("str_num = 1422");
    // No number typed: the name alone, matched on the name column. A direction and a street type
    // typed with it come off, as in the number + name clause (the column holds the bare name).
    expect(decodeURIComponent(propertyQueryUrl(split, "Western"))).toContain("upper(str_nam) like upper('%Western%')");
    expect(decodeURIComponent(propertyQueryUrl(split, "Western"))).not.toContain("str_num");
    expect(decodeURIComponent(propertyQueryUrl(split, "N Western Ave"))).toContain("upper(str_nam) like upper('%Western%')");
    expect(decodeURIComponent(propertyQueryUrl(split, "N Western Ave"))).not.toContain("str_num");
    // No streetNumber mapped: the whole typed line is the match, so a number-less "N Western Ave"
    // is not trimmed, and only a dataset that sets houseNumberSpaceRuns (Orlando's) ORs the spaced variants.
    expect(decodeURIComponent(propertyQueryUrl(base, "1422 N Western Ave"))).toContain("$where=upper(str_nam) like upper('%1422 N Western Ave%')");
    expect(decodeURIComponent(propertyQueryUrl(base, "1422 N Western Ave"))).not.toContain("%1422  N Western Ave");
    expect(decodeURIComponent(propertyQueryUrl(base, "N Western Ave"))).toContain("upper(str_nam) like upper('%N Western Ave%')");
  });

  it("buildCityQuery derives the street NAME for a split-address dataset with no streetNumber mapping", () => {
    // Live probe 2026-10-13 on Dallas violations (x9pz-kdq9): rows are
    // {str_num:"1500", str_nam:"MARILLA", str_suffix:"ST"}; 101 of 109 Marilla
    // rows carry the type in str_suffix, so '%Marilla St%' on str_nam matched 6
    // junk rows and '%Marilla%' all 109. The name is what the column holds.
    const [violations] = cityDatasets("dallas", "violations");
    expect(violations.addressParts).toEqual(["str_num", "str_prefix", "str_nam", "str_suffix"]);
    const url = buildCityQuery(violations, "1500 Marilla St")!;
    expect(url).toContain("upper(str_nam)%20like%20upper('%25Marilla%25')");
    expect(decodeURIComponent(url)).not.toContain("Marilla St");
    expect(buildCityQuery(violations, "1500 N Marilla St")).toBe(url);
    expect(buildCityQuery(violations, "Marilla")).toBe(url);
    expect(streetForDataset(violations, "1500 Marilla St")).toBe("Marilla");
    // The raw site URL is still propertyQueryUrl: the page is unchanged.
    expect(decodeURIComponent(propertyQueryUrl(getCityProperty("dallas")!.datasets.violations!, "1500 Marilla St"))).toContain("$where=upper(str_nam) like upper('%1500 Marilla St%')");
    // Single-column datasets keep the whole line.
    const [permits] = cityDatasets("dallas", "permits");
    expect(decodeURIComponent(buildCityQuery(permits, "600 Commerce St")!)).toContain("$where=upper(street_address) like upper('%600 Commerce St%')");
    expect(decodeURIComponent(buildCityQuery(permits, "600 Commerce St")!)).not.toContain("%600  Commerce St");
    expect(streetForDataset(permits, "600 Commerce St")).toBe("600 Commerce St");
    expect(permits.queryNote).not.toContain("The space after a leading house number");
    // Orlando opts in: the typed text is ORed with 1 to 4 spaces after the house number, and the note says so.
    const [orlando] = cityDatasets("orlando", "permits");
    const orlandoUrl = decodeURIComponent(buildCityQuery(orlando, "4274 Tatum St")!);
    expect(orlandoUrl).toContain("$where=(upper(permit_address) like upper('%4274 Tatum St%') OR upper(permit_address) like upper('%4274  Tatum St%')");
    expect(orlandoUrl).toContain("like upper('%4274    Tatum St%'))");
    expect(orlando.queryNote).toContain("The space after a leading house number also matches a run of up to 4 spaces, or the spacing as typed, and nothing else");
    // 'N St' on Dallas violations is the street N, not '%St%'; 'N % St' is not '%%%'.
    expect(streetForDataset(violations, "N St")).toBe("N St");
    expect(streetForDataset(violations, "N Q St")).toBe("N Q St");
    expect(streetForDataset(violations, "N % St")).toBe("N % St");
    expect(decodeURIComponent(buildCityQuery(violations, "N St")!)).toContain("like upper('%N St%')");
    // A street NAME that is a type or direction word keeps its strip: '100 Court St' is the street Court,
    // and a rejected strip drops the house number (the name column never holds one).
    expect(streetForDataset(violations, "100 Court St")).toBe("Court");
    expect(streetForDataset(violations, "Court St")).toBe("Court");
    expect(streetForDataset(violations, "Plaza Dr")).toBe("Plaza");
    expect(streetForDataset(violations, "100 N St")).toBe("N St");
    expect(decodeURIComponent(buildCityQuery(violations, "100 N St")!)).toContain("like upper('%N St%')");
    expect(decodeURIComponent(buildCityQuery(violations, "100 Court St")!)).toContain("like upper('%Court%')");
    // A house number plus one unsafe token goes as typed, not as the bare token ('%%%' for a typed %).
    for (const typed of ["100 %", "100 _", "100 E", "100 -", "100 St"]) {
      expect(streetForDataset(violations, typed), typed).toBe(typed);
    }
    expect(streetForDataset(violations, "100 N St")).toBe("N St");
    // A spelled-out direction with its type is the street South or North; an abbreviated one is not.
    expect(streetForDataset(violations, "2600 South Blvd")).toBe("South");
    expect(streetForDataset(violations, "100 North Ave")).toBe("North");
    expect(streetForDataset(violations, "South St")).toBe("South");
    expect(streetForDataset(violations, "NE St")).toBe("NE St");
    expect(streetForDataset(violations, "2600 South Blvd.")).toBe("South");
    expect(streetForDataset(violations, "North Court St")).toBe("Court");
    expect(streetForDataset(violations, "100 North Court St")).toBe("Court");
    // No type column (Chicago permits): the type stays with the direction.
    const [chicago] = cityDatasets("chicago", "permits");
    expect(streetForDataset(chicago, "100 North St")).toBe("North St");
    // The page-side name trim on a split-street table (Los Angeles): a period on the type, and a type after the directional.
    const la = getCityProperty("los-angeles")!.datasets.violations!;
    expect(decodeURIComponent(propertyQueryUrl(la, "South Blvd."))).toContain("like upper('%South%')");
    expect(decodeURIComponent(propertyQueryUrl(la, "North Court St"))).toContain("like upper('%Court%')");
    const [boston] = cityDatasets("boston", "violations");
    expect(streetForDataset(boston, "100 E")).toBe("100 E");
    expect(streetForDataset(boston, "100 Court St")).toBe("Court");
    expect(decodeURIComponent(buildCityQuery(boston, "100 Court St")!)).toContain("ILIKE '%Court%'");
    const [sf] = cityDatasets("san-francisco", "violations");
    expect(streetForDataset(sf, "100 South Blvd")).toBe("South");
    expect(violations.queryNote).toContain("matches the street name on str_nam and returns every row on that street");
  });

  it("a split-street table with a house number typed gets the agent's street rules, and the page and agent send the same needle", () => {
    const sets = [
      [getCityProperty("los-angeles")!.datasets.violations!, /like upper\('%(.*?)%'\)/, "stno = '100'"],
      [getCityProperty("fort-worth")!.datasets.permits!, /LIKE UPPER\('%(.*?)%'\)/, "Addr_No = 100"],
      [getCityProperty("scottsdale")!.datasets.violations!, /LIKE UPPER\('%(.*?)%'\)/, "StreetNumber = 100"],
    ] as const;
    const agentParts = ["str_num", "str_prefix", "str_nam", "str_suffix"];
    const needle = (ds: PropertyDataset, re: RegExp, typed: string) => re.exec(decodeURIComponent(propertyQueryUrl(ds, typed)))![1];
    for (const [ds, re, numberClause] of sets) {
      for (const [typed, expected] of [
        ["100 South Blvd", "South"],
        ["100 North Ave", "North"],
        ["100 South St", "South"],
        ["100 NE St", "NE St"],
        ["100 N Court St", "Court"],
        ["100 North Court St", "Court"],
      ] as const) {
        expect(needle(ds, re, typed), `${ds.fields.address} ${typed}`).toBe(expected);
        expect(decodeURIComponent(propertyQueryUrl(ds, typed)), typed).toContain(numberClause);
      }
      // A number plus one unsafe token: the typed line goes as a plain match, with no number clause.
      for (const typed of ["100 %", "100 _", "100 E", "100 N", "100 St", "100 Ave"]) {
        expect(needle(ds, re, typed), `${ds.fields.address} ${typed}`).toBe(typed);
        expect(decodeURIComponent(propertyQueryUrl(ds, typed)), typed).not.toContain(numberClause);
      }
      // A lettered street (number, optional direction, ONE letter or digit, a type word): the page keeps the number
      // clause and searches the lone letter; the agent refuses a lone letter. One of two intended page-vs-agent differences.
      for (const [typed, expected, clause] of [
        ["1700 E Q St", "Q", numberClause.replace("100", "1700")],
        ["100 Q St", "Q", numberClause],
        ["100 N A St", "A", numberClause],
        ["100 E St", "E", numberClause],
        ["100 N St", "N", numberClause],
        ["100 N E St", "E", numberClause],
      ] as const) {
        expect(needle(ds, re, typed), `${ds.fields.address} ${typed}`).toBe(expected);
        expect(decodeURIComponent(propertyQueryUrl(ds, typed)), typed).toContain(clause);
        expect(splitAddressStreetName(agentParts, "str_nam", undefined, typed), typed).not.toBe(expected);
      }
      const lettered = new Set<string>();
      // The direction letters N and E count as a lettered street only before St and Ave.
      for (const l of ["N", "E"]) for (const t of ["St", "Ave"]) lettered.add(`100 ${l} ${t}`);
      // Before any other type word they are a direction plus a street: the page searches the type word, the agent leaves both.
      for (const [typed, expected] of [
        ["100 N Court", "Court"],
        ["100 E Blvd.", "Blvd"],
        ["100 North Court", "North"],
      ] as const) {
        expect(needle(ds, re, typed), `${ds.fields.address} ${typed}`).toBe(expected);
        expect(decodeURIComponent(propertyQueryUrl(ds, typed)), typed).toContain(numberClause);
      }
      for (const d of ["N", "E"]) for (const t of ["Blvd.", "Court"]) lettered.add(`100 ${d} ${t}`);
      const exceptions = new Set<string>();
      const vocab = ["N", "North", "South", "St", "Ave", "Blvd.", "Court", "%", "E"];
      for (const a of vocab) {
        for (const b of vocab) {
          for (const typed of [`100 ${a}`, `100 ${a} ${b}`]) {
            if (needle(ds, re, typed) !== splitAddressStreetName(agentParts, "str_nam", undefined, typed)) exceptions.add(typed);
          }
        }
      }
      expect([...exceptions].sort(), ds.fields.address).toEqual([...lettered].sort());
    }
  });

  it("splitAddressStreetName follows the columns around the name column", () => {
    // [number, direction, name, type] (Dallas violations): all three come off.
    const dallas = ["str_num", "str_prefix", "str_nam", "str_suffix"];
    expect(splitAddressStreetName(dallas, "str_nam", undefined, "1500 N Marilla St")).toBe("Marilla");
    expect(splitAddressStreetName(dallas, "str_nam", undefined, "1500 Marilla St.")).toBe("Marilla");
    expect(splitAddressStreetName(dallas, "str_nam", undefined, "Marilla")).toBe("Marilla");
    expect(splitAddressStreetName(dallas, "str_nam", undefined, "1500 Marilla")).toBe("Marilla");
    // [number, direction, name] (Chicago permits, Indianapolis cases): the name column holds
    // "WESTERN AVE", so the type stays; the direction comes off.
    const chicago = ["street_number", "street_direction", "street_name"];
    expect(splitAddressStreetName(chicago, "street_name", undefined, "1422 N Western Ave")).toBe("Western Ave");
    // [number, name, type] (Boston, San Francisco): no direction column, so "West" stays in the name.
    const boston = ["violation_stno", "violation_street", "violation_suffix"];
    expect(splitAddressStreetName(boston, "violation_street", undefined, "400 West Boylston St")).toBe("West Boylston");
    expect(splitAddressStreetName(boston, "violation_street", undefined, "1252-1270 Boylston Street")).toBe("Boylston");
    // [number, name] (NYC): only the number comes off; "WEST BROADWAY" is how the column reads.
    const nyc = ["house_no", "street_name"];
    expect(splitAddressStreetName(nyc, "street_name", undefined, "180 West Broadway")).toBe("West Broadway");
    // Never empties the street: a lone type or a lone number is sent as typed.
    expect(splitAddressStreetName(dallas, "str_nam", undefined, "St")).toBe("St");
    expect(splitAddressStreetName(dallas, "str_nam", undefined, "1500")).toBe("1500");
    // No role information (no parts, name column not among them, or a mapped number column): unchanged.
    expect(splitAddressStreetName(undefined, "street_address", undefined, "600 Commerce St")).toBe("600 Commerce St");
    expect(splitAddressStreetName(["a", "b"], "c", undefined, "600 Commerce St")).toBe("600 Commerce St");
    expect(splitAddressStreetName(dallas, "str_nam", "str_num", "1500 Marilla St")).toBe("1500 Marilla St");
  });

  it("splitStreet parses the shapes the plan names", () => {
    expect(splitStreet("1422 N Western Ave")).toEqual({ number: "1422", name: "Western" });
    expect(splitStreet("600 Commerce St")).toEqual({ number: "600", name: "Commerce" });
    expect(splitStreet("1422A Western")).toEqual({ number: "1422", name: "Western" });
    expect(splitStreet("1422-B Western Ave.")).toEqual({ number: "1422", name: "Western" });
    expect(splitStreet("100 Main")).toEqual({ number: "100", name: "Main" });
    expect(splitStreet("100 St")).toEqual({ number: "100", name: "St" });
    expect(splitStreet("Main St")).toBeNull();
    expect(splitStreet("1422")).toBeNull();
  });
});

describe("hostile or careless input at the public API", () => {
  it("a JavaScript caller's null, undefined or number is read as text, never a TypeError", () => {
    const loose = findCity as unknown as (ref: unknown, state?: unknown) => CitySummary[];
    expect(loose(undefined)).toEqual([]);
    expect(loose(null)).toEqual([]);
    expect(loose(42)).toEqual([]);
    expect(loose("Dallas", null)[0].slug).toBe("dallas");
    expect((cityDatasets as unknown as (slug: unknown) => unknown[])(undefined)).toEqual([]);
    const [permits] = cityDatasets("dallas", "permits");
    const build = buildCityQuery as unknown as (d: unknown, street: unknown) => string | null;
    expect(decodeURIComponent(build(permits, 123)!)).toContain("%123%");
    expect(build(permits, null)).toBe(buildCityQuery(permits, ""));
  });

  it("a street over the cap or with a lone surrogate is refused with a plain error, not a URIError", () => {
    const [permits] = cityDatasets("dallas", "permits");
    expect(() => buildCityQuery(permits, "9".repeat(121))).toThrow(RangeError);
    expect(buildCityQuery(permits, "9".repeat(120))).toContain("9".repeat(120));
    expect(() => buildCityQuery(permits, "\ud800")).toThrow(TypeError);
    expect(() => buildCityQuery(permits, "\ud800")).not.toThrow(URIError);
  });

  it("a prototype key as a city reference matches nothing", () => {
    for (const ref of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      expect(findCity(ref)).toEqual([]);
    }
  });
});

describe("nothing fetches", () => {
  it("resolving, listing and building queries made no network call", () => {
    listCities();
    findCity("Dallas, TX");
    for (const c of listCities()) for (const d of cityDatasets(c.slug)) buildCityQuery(d, "Main");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
