/**
 * The paused answer: the `coverage` block the hosted API returns for a county
 * that is in the atlas but paused by its terms or a law, and the surface flags
 * and presets it is built from. Which counties are paused is live data from the
 * hosted API, so nothing here reads the bundled records.
 */
import { describe, it, expect } from "vitest";
import * as pkgEntry from "../src/index.js";
import {
  ACCESS_FLAGS,
  ACCESS_PRESETS,
  ACCESS_REASONS,
  ATLAS_COUNTY_PAGE_BASE,
  PRESET_FLAGS,
  accessBlocks,
  countyDownMessage,
  discoverySafeContact,
  discoverySafeUrl,
  flagsFor,
  pausedAnswer,
  pausedFlags,
  presetOf,
  type AccessFlags,
} from "../src/access.js";

describe("countyDownMessage", () => {
  it("names the county's end, says nothing about money, and is exported from the package entry", () => {
    const text = countyDownMessage("Fulton County");
    expect(text).toBe(
      "Fulton County's GIS server is down on the county's end, so its parcel data can't be reached right now. Try again later, or use the county office's own site.",
    );
    expect(text).not.toMatch(/charge|bill|refund|quota/i);
    expect(pkgEntry.countyDownMessage).toBe(countyDownMessage);
  });

  it("without a county name it says 'The county's'", () => {
    expect(countyDownMessage(null)).toMatch(/^The county's GIS server is down on the county's end, /);
    expect(countyDownMessage(undefined)).toBe(countyDownMessage(null));
    expect(countyDownMessage("")).toBe(countyDownMessage(null));
  });
});

const entry = {
  county_fips: "53011",
  flags: flagsFor("paid-lists-off"),
  reason: "licence-terms" as const,
  why: "Clark County's terms restrict commercial use of lists of individuals.",
  citation_url: "https://example.gov/terms",
  since: "2026-10-17",
};
const only = (...on: Array<(typeof ACCESS_FLAGS)[number]>): AccessFlags =>
  Object.fromEntries(ACCESS_FLAGS.map((f) => [f, on.includes(f)])) as AccessFlags;

describe("flags and presets", () => {
  it("seven surfaces, in a fixed order", () => {
    expect(ACCESS_FLAGS).toEqual(["paid_lookup", "paid_enrich", "paid_bulk", "paid_lists", "free_site_lookup", "free_site_lists", "free_discovery"]);
  });

  it("paid-off pauses every billed surface, paid-lists-off only the billed lists, all-off everything", () => {
    expect(pausedFlags(flagsFor("paid-off"))).toEqual(["paid_lookup", "paid_enrich", "paid_bulk", "paid_lists"]);
    expect(pausedFlags(flagsFor("paid-lists-off"))).toEqual(["paid_bulk", "paid_lists"]);
    expect(pausedFlags(flagsFor("all-off"))).toEqual([...ACCESS_FLAGS]);
    for (const p of ACCESS_PRESETS) expect(pausedFlags(flagsFor(p))).toEqual([...PRESET_FLAGS[p]]);
  });

  it("presetOf names a preset back, and anything else custom", () => {
    for (const p of ACCESS_PRESETS) expect(presetOf(flagsFor(p))).toBe(p);
    expect(presetOf(only("paid_lookup"))).toBe("custom");
  });

  it("accessBlocks reads one flag; no entry is fully on", () => {
    expect(ACCESS_FLAGS.filter((f) => accessBlocks(entry, f))).toEqual(["paid_bulk", "paid_lists"]);
    expect(accessBlocks(null, "paid_lookup")).toBe(false);
  });
});

describe("pausedAnswer", () => {
  it("carries the entry, the paused surfaces, the county office, the free page and no request", () => {
    const a = pausedAnswer(entry, { contact: { department: "Assessor", url: null } }, { state_slug: "washington", county_slug: "clark-county" });
    expect(a).toEqual({
      indexed: true,
      status: "paused",
      preset: "paid-lists-off",
      paused: ["paid_bulk", "paid_lists"],
      reason: "licence-terms",
      why: entry.why,
      citation_url: entry.citation_url,
      since: "2026-10-17",
      county_office: { department: "Assessor", url: null },
      free_alternatives: { county_page: `${ATLAS_COUNTY_PAGE_BASE}/washington/clark-county` },
      request: null,
    });
  });

  it("no free page when the free lookup or discovery is paused", () => {
    const page = { state_slug: "washington", county_slug: "clark-county" };
    expect(pausedAnswer({ ...entry, flags: flagsFor("all-off") }, null, page).free_alternatives).toBeNull();
    expect(pausedAnswer({ ...entry, flags: only("free_site_lookup") }, null, page).free_alternatives).toBeNull();
    expect(pausedAnswer({ ...entry, flags: only("free_site_lists") }, null, page).free_alternatives).not.toBeNull();
  });

  it("with the endpoint URLs withheld, the county office names neither an endpoint host nor a REST path", () => {
    const record = {
      contact: { department: "County GIS, Parcels MapServer", url: "https://gis.example.gov/portal" },
      endpoints: [{ url: "https://gis.example.gov/arcgis/rest/services/Parcels/MapServer/0" }],
    };
    expect(pausedAnswer({ ...entry, flags: flagsFor("all-off") }, record).county_office).toEqual({ department: null, url: null });
    expect(pausedAnswer({ ...entry, flags: only("free_discovery") }, record).county_office).toEqual({ department: null, url: null });
    // A neutral office page stays; and with the endpoints served the office is shown as is.
    const neutral = { ...record, contact: { department: "Assessor", url: "https://www.example.gov/assessor" } };
    expect(pausedAnswer({ ...entry, flags: flagsFor("all-off") }, neutral).county_office).toEqual(neutral.contact);
    expect(pausedAnswer({ ...entry, flags: flagsFor("paid-off") }, record).county_office).toEqual(record.contact);
  });

  it("with the endpoint URLs withheld, a citation naming the service is null; otherwise it is shown as is", () => {
    const record = { endpoints: [{ url: "https://gis.example.gov/arcgis/rest/services/Parcels/MapServer/0" }] };
    const onService = { ...entry, citation_url: "https://gis.example.gov/arcgis/rest/services/Parcels/MapServer" };
    expect(pausedAnswer({ ...onService, flags: flagsFor("all-off") }, record).citation_url).toBeNull();
    expect(pausedAnswer({ ...onService, flags: flagsFor("all-off") }, null).citation_url).toBeNull();
    expect(pausedAnswer({ ...onService, flags: flagsFor("paid-off") }, record).citation_url).toBe(onService.citation_url);
    expect(pausedAnswer({ ...entry, flags: flagsFor("all-off") }, record).citation_url).toBe(entry.citation_url);
  });

  it("with the endpoint URLs withheld, a stored why naming the service is null; otherwise it is shown as is", () => {
    const record = { endpoints: [{ url: "https://gis.example.gov/arcgis/rest/services/Parcels/MapServer/0" }] };
    const named = { ...entry, why: "Paused; the terms are on gis.example.gov." };
    expect(pausedAnswer({ ...named, flags: flagsFor("all-off") }, record).why).toBeNull();
    expect(pausedAnswer({ ...named, flags: flagsFor("paid-off") }, record).why).toBe(named.why);
    expect(pausedAnswer({ ...entry, flags: flagsFor("all-off") }, record).why).toBe(entry.why);
  });

  it("the reasons are a closed list", () => {
    expect(ACCESS_REASONS).toEqual(["licence-terms", "state-law", "county-request", "data-quality", "upstream-broken", "other"]);
  });
});

describe("discoverySafeContact: one normalisation per case", () => {
  const rec = (url: string) => ({ endpoints: [{ url }] });
  const EP = rec("https://gis.example.gov/arcgis/rest/services/Parcels/MapServer/0");

  it("CONTROL: a value naming another host, or no host, is shown as is", () => {
    expect(discoverySafeContact("https://www.example.gov/assessor", EP)).toBe("https://www.example.gov/assessor");
    expect(discoverySafeContact("County Assessor", EP)).toBe("County Assessor");
    expect(discoverySafeContact("assessor@example.gov", EP)).toBe("assessor@example.gov");
  });
  it("an endpoint with a port: compared by hostname", () => {
    expect(discoverySafeContact("https://gis.example.gov/portal", rec("https://gis.example.gov:6443/arcgis/x"))).toBeNull();
  });
  it("case: an upper-case value names the host", () => {
    expect(discoverySafeContact("HTTPS://GIS.EXAMPLE.GOV/portal", EP)).toBeNull();
  });
  it("www on the endpoint, none on the value", () => {
    expect(discoverySafeContact("https://maps.gov/portal", rec("https://www.maps.gov/arcgis/x"))).toBeNull();
  });
  it("www on the value, none on the endpoint", () => {
    expect(discoverySafeContact("https://www.gis.example.gov/portal", EP)).toBeNull();
  });
  it("a trailing dot on the endpoint host", () => {
    expect(discoverySafeContact("https://gis.example.gov/portal", rec("https://gis.example.gov./arcgis/x"))).toBeNull();
  });
  it("a trailing dot on the value's host", () => {
    expect(discoverySafeContact("https://gis.example.gov./portal", EP)).toBeNull();
  });
  it("punycode: a Unicode value against the parser's ASCII endpoint host", () => {
    expect(discoverySafeContact("https://gis.münchen.de/portal", rec("https://gis.xn--mnchen-3ya.de/arcgis/x"))).toBeNull();
  });
  it("punycode: an ASCII value against a Unicode endpoint url", () => {
    expect(discoverySafeContact("https://gis.xn--mnchen-3ya.de/portal", rec("https://gis.münchen.de/arcgis/x"))).toBeNull();
  });
  it("percent-encoding in the value's host", () => {
    expect(discoverySafeContact("https://gis%2Eexample%2Egov/portal", EP)).toBeNull();
  });
  it("a gis.county.gov endpoint keeps an assessor.county.gov contact (a sibling)", () => {
    expect(discoverySafeContact("https://assessor.county.gov/", rec("https://gis.county.gov/arcgis/x"))).toBe("https://assessor.county.gov/");
  });
  it("the same host is nulled", () => {
    expect(discoverySafeContact("https://www.county.gov/gis", rec("https://www.county.gov/arcgis/x"))).toBeNull();
  });
  it("fail closed: a name under a www. endpoint's domain is nulled (tx-harris's maps.gis.hctx.net beside www.gis.hctx.net)", () => {
    expect(discoverySafeContact("https://maps.gis.hctx.net/", rec("https://www.gis.hctx.net/arcgis/x"))).toBeNull();
    expect(discoverySafeContact("https://county.hub.arcgis.com/", rec("https://www.arcgis.com/x"))).toBeNull();
  });
  it("fail closed: a longer name that begins with the endpoint host is nulled; CONTROL a letter glued before it is another host", () => {
    expect(discoverySafeContact("https://gis.example.gov.other.net/", EP)).toBeNull();
    expect(discoverySafeContact("https://xgis.example.gov/", EP)).toBe("https://xgis.example.gov/");
  });
  it("child host: a name under the endpoint host names the service; its parent stays (tn-shelby's shape)", () => {
    expect(discoverySafeContact("https://fiscalhub.gis.example.gov/", EP)).toBeNull();
    expect(discoverySafeContact("https://shelbycountytn.gov/", rec("https://scgis.shelbycountytn.gov/arcgis/x"))).toBe("https://shelbycountytn.gov/");
  });
  it.each([
    ["curly quotes", "See “gis.example.gov” for the terms."],
    ["a curly apostrophe", "gis.example.gov’s terms apply."],
    ["an em dash", "Paused at the county’s request—gis.example.gov—until review."],
    ["an ellipsis", "See gis.example.gov…"],
    ["fullwidth stops", "See gis．example．gov for the terms."],
    ["ideographic stops", "See gis。example。gov for the terms."],
  ])("typographic punctuation beside the host: %s, nulled", (_name, value) => {
    expect(discoverySafeContact(value, EP)).toBeNull();
  });
  it("CONTROL: the same punctuation beside a sibling host, or in plain prose, is shown as is", () => {
    const sibling = "See “assessor.example.gov”—the county’s office…";
    const prose = "The county’s terms—cited below… restrict “commercial” use.";
    expect(discoverySafeContact(sibling, EP)).toBe(sibling);
    expect(discoverySafeContact(prose, EP)).toBe(prose);
  });
  it("a value longer than any stored one is null; CONTROL a stored length is matched as usual", () => {
    expect(discoverySafeContact(`County Assessor ${"a".repeat(2100)}`, EP)).toBeNull();
    expect(discoverySafeContact(`County Assessor ${"a".repeat(400)}`, EP)).toBe(`County Assessor ${"a".repeat(400)}`);
  });
  it("a host inside another URL's query string is still named", () => {
    expect(discoverySafeContact("https://redirect.gov/?to=https://gis.example.gov/portal", EP)).toBeNull();
  });
  it("percent-encoding in a REST path", () => {
    expect(discoverySafeContact("https://other.gov/arcgis/rest%2Fservices/Parcels", null)).toBeNull();
  });
  it("rest/services starts a path segment: a forest/services page is kept; a bare rest/services path is not", () => {
    expect(discoverySafeContact("https://county.gov/forest/services", null)).toBe("https://county.gov/forest/services");
    expect(discoverySafeContact("https://county.gov/rest/services", null)).toBeNull();
    expect(discoverySafeContact("rest/services/Parcels", null)).toBeNull();
  });
  it("an email at the endpoint host", () => {
    expect(discoverySafeContact("mailto:parcels@gis.example.gov", EP)).toBeNull();
  });
  it.each([
    ["GPServer", "https://other.gov/arcgis/services/Tools/GPServer"],
    ["VectorTileServer", "https://tiles.other.gov/Parcels/VectorTileServer"],
    ["SceneServer", "https://other.gov/Buildings/SceneServer"],
    ["/sharing/rest", "https://other.gov/portal/sharing/rest/content/items/abc"],
    ["arcgis.com/home/item", "https://www.arcgis.com/home/item.html?id=abc"],
  ])("the REST pattern names a %s", (_name, value) => {
    expect(discoverySafeContact(value, null)).toBeNull();
  });
  it("a default-ignorable inside the host is dropped, as a reader does not see it (CGJ, VS16, a Hangul filler, a Mongolian selector)", () => {
    for (const cp of [0x34f, 0xfe0f, 0x3164, 0x180b]) {
      const c = String.fromCodePoint(cp);
      expect(discoverySafeContact(`The gis.exa${c}mple.gov-hosted viewer's terms`, EP), cp.toString(16)).toBeNull();
    }
  });
  it("a tab or newline inside the host is deleted, as the URL parser deletes it, also as a percent-escape; the newline also still separates", () => {
    for (const v of ["https://gis.exa\tmple.gov/terms", "See gis.exa\nmple.gov for terms.", "See gis.exa\r\nmple.gov.", "See gis.exa%09mple.gov.", "https://gis.exa%0Ample.gov/x"]) {
      expect(discoverySafeContact(v, EP), JSON.stringify(v)).toBeNull();
    }
    // Deleting the newline alone would glue the host to the next word.
    expect(discoverySafeContact("Hosted at gis.example.gov\nTerms forbid resale.", EP)).toBeNull();
    // CONTROL: a newline between two words that are not the host.
    expect(discoverySafeContact("The county's\nterms", EP)).toBe("The county's\nterms");
  });
});

describe("discoverySafeUrl: a url as the URL parser reads it", () => {
  const EP = { endpoints: [{ url: "https://gis.example.gov/arcgis/rest/services/Parcels/MapServer/0" }] };
  const IP ={ endpoints: [{ url: "https://10.20.30.40/arcgis/rest/services/Parcels/MapServer/0" }] };
  it("a host the parser rewrites: a bare number is an IPv4 address, so https://169090600/ links to 10.20.30.40", () => {
    expect(discoverySafeContact("https://169090600/terms", IP)).toBe("https://169090600/terms");
    expect(discoverySafeUrl("https://169090600/terms", IP)).toBeNull();
    expect(discoverySafeUrl("https://0xa141e28/terms", IP)).toBeNull();
    // CONTROL: another address is another host.
    expect(discoverySafeUrl("https://169090601/terms", IP)).toBe("https://169090601/terms");
  });
  it("the text is checked too, and a value the parser refuses is judged as text", () => {
    expect(discoverySafeUrl("https://gis.exa\tmple.gov/terms", EP)).toBeNull();
    expect(discoverySafeUrl("see gis.example.gov", EP)).toBeNull();
    expect(discoverySafeUrl("see the county's terms", EP)).toBe("see the county's terms");
    expect(discoverySafeUrl("https://www.example.gov/assessor", EP)).toBe("https://www.example.gov/assessor");
  });
  it("pausedAnswer reads the citation and the office url this way under free_discovery", () => {
    const withheld = { ...entry, flags: flagsFor("all-off"), citation_url: "https://169090600/terms" };
    const out = pausedAnswer(withheld, { ...IP, contact: { department: "GIS", url: "https://169090600/" } });
    expect(out.citation_url).toBeNull();
    expect(out.county_office).toEqual({ department: "GIS", url: null });
  });
});

describe("the package entry", () => {
  it("exports the builder, the predicate, the helpers and the lists", () => {
    expect(pkgEntry.pausedAnswer).toBe(pausedAnswer);
    expect(pkgEntry.accessBlocks).toBe(accessBlocks);
    expect(pkgEntry.flagsFor).toBe(flagsFor);
    expect(pkgEntry.pausedFlags).toBe(pausedFlags);
    expect(pkgEntry.presetOf).toBe(presetOf);
    expect(pkgEntry.ACCESS_FLAGS).toBe(ACCESS_FLAGS);
    expect(pkgEntry.ACCESS_PRESETS).toBe(ACCESS_PRESETS);
    expect(pkgEntry.PRESET_FLAGS).toBe(PRESET_FLAGS);
    expect(pkgEntry.ACCESS_REASONS).toBe(ACCESS_REASONS);
    expect(pkgEntry.ATLAS_COUNTY_PAGE_BASE).toBe(ATLAS_COUNTY_PAGE_BASE);
  });
});
