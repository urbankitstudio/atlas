/**
 * The coverage answer: why we cannot index a county, and the request that asks
 * us to look again. Run against the data this package ships, because the answer
 * is only as good as the records' `coverage` blocks surviving the sync into the
 * bundle.
 */
import { afterEach, describe, it, expect, vi } from "vitest";
import * as pkgEntry from "../src/index.js";
import {
  COUNTY_RECHECK_REQUEST_MESSAGE,
  COUNTY_REQUEST_MESSAGE,
  COUNTY_REQUEST_URL,
  COVERAGE_REASONS,
  NO_PUBLIC_DATA_WHY,
  NOT_IN_ATLAS_WHY,
  countyHasEndpoint,
  coverageAnswer,
  coverageAnswerText,
  requestHint,
  stateSlugFromAbbrev,
  type CountyRequestRef,
} from "../src/coverage.js";
import { atlas } from "../src/data.js";
import { findCountyByFips } from "../src/findCountyByFips.js";
import { countySlugFromName } from "../src/helpers.js";
import { parseHintBody } from "./request-contract.js";

const all = [...atlas.byStateSlug.values()].flatMap((s) => s.counties);

describe("countyHasEndpoint", () => {
  it("is true only for hasPublicRest true with at least one endpoint", () => {
    expect(countyHasEndpoint({ hasPublicRest: true, endpoints: [{}] })).toBe(true);
    expect(countyHasEndpoint({ hasPublicRest: true, endpoints: [] })).toBe(false);
    expect(countyHasEndpoint({ hasPublicRest: false, endpoints: [{}] })).toBe(false);
    expect(countyHasEndpoint({ hasPublicRest: true, endpoints: null })).toBe(false);
    expect(countyHasEndpoint(undefined)).toBe(false);
  });

  it("agrees with the bundled data's hasPublicRest on every county", () => {
    const disagree = all.filter((c) => countyHasEndpoint(c) !== c.hasPublicRest).map((c) => c.id);
    expect(disagree).toEqual([]);
  });
});

describe("the ref: one county, one request body, whatever the surface knows", () => {
  it("normalises the state from an abbreviation, a name, a slug or a state FIPS code, in any case", () => {
    const want = { state_slug: "illinois", county_slug: "kane-county" };
    for (const state of ["IL", "il", " Il ", "Illinois", "ILLINOIS", "illinois", "17"]) {
      expect(requestHint({ state, county: "Kane" })?.body, state).toEqual(want);
    }
    expect(requestHint({ state: "New Hampshire", county: "Hillsborough" })?.body).toMatchObject({ state_slug: "new-hampshire" });
    expect(requestHint({ state: "district of columbia", county: "District of Columbia" })?.body).toMatchObject({
      state_slug: "district-of-columbia",
      county_slug: "district-of-columbia",
    });
  });

  it("knows the 50 states and DC, each by every form", () => {
    const states = [...atlas.byStateSlug.values()];
    expect(states.length).toBe(51);
    for (const s of states) {
      for (const form of [s.stateAbbrev, s.stateAbbrev.toLowerCase(), s.stateName, s.stateSlug]) {
        expect(requestHint({ state: form, county: "Example" })?.body.state_slug, form).toBe(s.stateSlug);
        // A FIPS code whose prefix is no state leaves the state to the ref: the abbreviation shows the table matched.
        expect(requestHint({ state: form, fips: "99001" })?.body.state_abbrev, form).toBe(s.stateAbbrev);
      }
    }
  });

  it("stateSlugFromAbbrev: each state's abbreviation, in either case, gives its atlas slug; nothing else does", () => {
    for (const s of atlas.byStateSlug.values()) {
      expect(stateSlugFromAbbrev(s.stateAbbrev), s.stateAbbrev).toBe(s.stateSlug);
      expect(stateSlugFromAbbrev(` ${s.stateAbbrev.toLowerCase()} `), s.stateAbbrev).toBe(s.stateSlug);
    }
    for (const other of ["pr", "GU", "zz", "i1", "47", "tennessee", "t", "tnn", ""]) {
      expect(stateSlugFromAbbrev(other), other).toBeNull();
    }
  });

  it("the restated request contract stores a state abbreviation as the atlas slug, as the endpoint does", () => {
    expect(parseHintBody({ state_slug: "TN", county_slug: "davidson-county" })).toEqual({
      ok: true,
      value: { state_slug: "tennessee", county_slug: "davidson-county" },
    });
    expect(parseHintBody({ state_slug: "pr", county_slug: "x-county" })).toEqual({
      ok: true,
      value: { state_slug: "pr", county_slug: "x-county" },
    });
  });

  it("names a county with a FIPS code by the code, and takes its state from the code", () => {
    expect(requestHint({ state: "TX", county: "Hamilton", fips: "47065" })?.body).toEqual({
      county_fips: "47065",
      county_name: "Hamilton",
      state_abbrev: "TN",
    });
    expect(requestHint({ state: "", fips: " 06045 " })?.body).toEqual({ county_fips: "06045", state_abbrev: "CA" });
  });

  it("gives the same body for the same county however the name or slug is spelled", () => {
    const a = requestHint({ state: "IL", county: "kane-county" })?.body;
    for (const county of ["kane", "Kane", "KANE", "Kane County", " kane_county "]) {
      expect(requestHint({ state: "illinois", county })?.body, county).toEqual(a);
    }
    expect(a).toEqual({ state_slug: "illinois", county_slug: "kane-county" });
  });

  it("sends a state it does not know as the caller's own text, slugged, so the answer never says which states exist", () => {
    expect(requestHint({ state: "Narnia", county: "Kane" })?.body).toEqual({
      state_slug: "narnia",
      county_slug: "kane-county",
    });
    expect(requestHint({ state: "zz9-not-a-state", county: "kane-county" })?.body).toEqual({
      state_slug: "zz9-not-a-state",
      county_slug: "kane-county",
    });
  });

  it("slugs a county name by the atlas's own rule (countySlugFromName) for every bundled name", () => {
    const differ = all
      .filter((c) => /[a-z0-9]/i.test(c.county))
      .filter((c) => requestHint({ state: c.stateSlug, county: c.county })?.body.county_slug !== countySlugFromName(c.county).slice(0, 64).replace(/-+$/, ""))
      .map((c) => c.id);
    expect(all.length).toBeGreaterThan(300);
    expect(differ).toEqual([]);
  });

  it("slugs Prince George's, with any of its apostrophes, to the atlas's own slug", () => {
    const pg = all.find((c) => c.id === "md-prince-georges");
    expect(pg?.countySlug).toBe("prince-georges-county");
    for (const county of ["Prince George's", "Prince George\u2019s", "Prince George\u02bcs"]) {
      expect(requestHint({ state: "maryland", county })?.body.county_slug, county).toBe(pg?.countySlug);
      expect(requestHint({ state: "MD", county })?.body.county_slug, county).toBe(pg?.countySlug);
    }
  });

  it("keeps every bundled county slug as it is", () => {
    const differ = all.filter((c) => requestHint({ state: c.stateSlug, county: c.countySlug })?.body.county_slug !== c.countySlug).map((c) => c.id);
    expect(differ).toEqual([]);
  });

  it("offers no request when the ref names no county the endpoint accepts", () => {
    const refs: CountyRequestRef[] = [
      { state: "" },
      { state: "", county: "Kane" },
      { state: "---", county: "Kane" },
      { state: "IL" },
      { state: "IL", county: "---" },
      { state: "IL", county: "  " },
      { state: "IL", fips: "1708" },
    ];
    for (const ref of refs) expect(requestHint(ref), JSON.stringify(ref)).toBeNull();
  });

  it("drops a malformed FIPS code and names the county by its slugs instead", () => {
    expect(requestHint({ state: "IL", county: "Kane", fips: "1708" })?.body).toEqual({
      state_slug: "illinois",
      county_slug: "kane-county",
    });
  });
});

describe("request contract parity: every hint body is one the request endpoint accepts as is", () => {
  const states = [...atlas.byStateSlug.values()];
  const NAMES = [
    "Kane", "kane-county", "Hamiltn", "Prince George's", "St. Louis City", "Doña Ana", "O'Brien", "Miami-Dade",
    "Bethel Census Area", "Orleans Parish", "  Kane  ", "Kane\tCounty", "<b>Kane</b>", "Ka​ne", "Kane\u0007",
    "Kane\ud800", "x".repeat(81), "y".repeat(70), "Ward 2", "2nd District", "---Kane---", "KANE", "kane",
  ];
  const refs: CountyRequestRef[] = [];
  for (const s of states) {
    for (const county of NAMES) refs.push({ state: s.stateAbbrev, county });
    refs.push({ state: s.stateName, county: "Example" }, { state: s.stateSlug, county: "example-county" });
  }
  for (const c of all) {
    refs.push({ state: c.stateSlug, county: c.county, fips: c.countyFips }, { state: c.state, county: c.countySlug });
  }
  refs.push({ state: "", fips: "99999" }, { state: "PR", county: "San Juan", fips: "72127" }, { state: "GU", county: "Guam" });

  it("round-trips each body through the contract unchanged (keys and values)", () => {
    let hints = 0;
    const refused: string[] = [];
    for (const ref of refs) {
      for (const status of ["not-in-atlas", "no-public-data"] as const) {
        const hint = requestHint(ref, status);
        if (!hint) continue;
        hints++;
        const parsed = parseHintBody(hint.body);
        if (!parsed.ok || JSON.stringify(Object.entries(parsed.value).sort()) !== JSON.stringify(Object.entries(hint.body).sort())) {
          refused.push(`${JSON.stringify(ref)} -> ${JSON.stringify(hint.body)} -> ${JSON.stringify(parsed)}`);
        }
        expect(hint.url).toBe(COUNTY_REQUEST_URL);
      }
    }
    expect(hints).toBeGreaterThan(3000);
    expect(refused).toEqual([]);
  });

  it("CONTROL: the contract refuses a body with an invented key, a bad slug or no county", () => {
    expect(parseHintBody({ county_fips: "17089", state: "illinois" }).ok).toBe(false);
    expect(parseHintBody({ state_slug: "illinois", county_slug: "foo--bar" }).ok).toBe(false);
    expect(parseHintBody({ state_slug: "illinois" }).ok).toBe(false);
    expect(parseHintBody({ county_fips: "17089", county_name: "Kane\u0007" }).ok).toBe(false);
    expect(parseHintBody({ county_fips: "17089", county_name: "x".repeat(81) }).ok).toBe(false);
  });
});

describe("coverageAnswer", () => {
  it("a served county gets no block", () => {
    const kane = findCountyByFips("17089");
    expect(kane).toBeTruthy();
    expect(coverageAnswer(kane, { state: "IL", fips: "17089" })).toBeNull();
  });

  it("no record: not-in-atlas, the plain request", () => {
    const a = coverageAnswer(undefined, { state: "MI", fips: "26031" });
    expect(a).toMatchObject({ indexed: false, status: "not-in-atlas", reason: null, why: NOT_IN_ATLAS_WHY, checked: null });
    expect(a.request).toEqual({
      how: "POST",
      url: COUNTY_REQUEST_URL,
      body: { county_fips: "26031", state_abbrev: "MI" },
      message: COUNTY_REQUEST_MESSAGE,
    });
  });

  it("a record without a coverage block still says it has no public data", () => {
    const a = coverageAnswer({ hasPublicRest: false, endpoints: [] }, { state: "MI", fips: "26031" });
    expect(a).toMatchObject({ status: "no-public-data", reason: null, why: NO_PUBLIC_DATA_WHY });
    expect(a?.request?.message).toBe(COUNTY_RECHECK_REQUEST_MESSAGE);
  });

  it("names the county product only for owner-data-sold", () => {
    const product = { name: "County Data Hub", url: "https://example.gov/data" };
    const sold = coverageAnswer(
      { hasPublicRest: false, endpoints: [], coverage: { reason: "owner-data-sold", summary: "s", checked: "2026-10-17", countyProduct: product } },
      { state: "PA", fips: "42071" },
    );
    expect(sold?.county_product).toEqual(product);
    const other = coverageAnswer(
      { hasPublicRest: false, endpoints: [], coverage: { reason: "technical", summary: "s", checked: "2026-10-17", countyProduct: product } },
      { state: "PA", fips: "42071" },
    );
    expect(other?.county_product).toBeNull();
  });

  it("the package entry exports the builder, the text render and the reason codes", () => {
    expect(pkgEntry.coverageAnswer).toBe(coverageAnswer);
    expect(pkgEntry.coverageAnswerText).toBe(coverageAnswerText);
    expect(pkgEntry.countyHasEndpoint).toBe(countyHasEndpoint);
    expect(pkgEntry.requestHint).toBe(requestHint);
    expect(pkgEntry.COVERAGE_REASONS).toBe(COVERAGE_REASONS);
    expect(COVERAGE_REASONS).toHaveLength(9);
  });
});

describe("coverageAnswerText: one text, carried as message", () => {
  const typo = coverageAnswer(undefined, { state: "TN", county: "Hamiltn" });
  const byFips = coverageAnswer(undefined, { state: "TN", county: "Hamilton", fips: "47065" });
  const hillsborough = findCountyByFips("33011")!;
  const npr = coverageAnswer(hillsborough, { state: "NH", county: hillsborough.county, fips: "33011" })!;

  it("is the block's message, on every kind of block", () => {
    for (const block of [typo, byFips, npr, coverageAnswer(undefined, { state: "", county: "Kane" })]) {
      expect(block.message).toBe(coverageAnswerText(block));
    }
  });

  it("a named county not in the atlas: says only that, asks for a spelling check, then offers the request", () => {
    const lines = typo.message.split("\n");
    expect(lines[0]).toBe("This county is not in the UrbanKit atlas.");
    expect(lines[1]).toMatch(/^Check the spelling first/);
    expect(lines[1]).toContain("find_county or list_counties");
    expect(lines[1]).toContain("`uks find`");
    expect(lines[2]).toMatch(/^If the county is right, offer to request it/);
    expect(lines[2]).toContain(JSON.stringify(typo.request!.body));
    expect(lines[2]).toContain(COUNTY_REQUEST_URL);
    expect(lines[2]).toContain("`uks request-county --state tennessee --county hamiltn-county`");
    // Typo safety: nothing in the text claims the county was never looked at, or that it exists.
    expect(typo.message).not.toMatch(/haven't|have not|never|yet|researched|indexed this county/i);
    expect(COUNTY_REQUEST_MESSAGE).not.toMatch(/haven't|have not|never|yet\b|researched/i);
  });

  it("a county given by FIPS code skips the spelling check", () => {
    expect(byFips.message).not.toMatch(/spelling/);
    expect(byFips.message).toContain("`uks request-county --fips 47065`");
  });

  it("a recorded county: its own sentence, the check date, the county office, the recheck promise of nothing", () => {
    const lines = npr.message.split("\n");
    expect(lines[0]).toBe(hillsborough.coverage!.summary);
    expect(lines).toContain(`Checked: ${hillsborough.coverage!.checked}`);
    expect(lines.some((l) => l.startsWith("County office: ") && l.includes(hillsborough.contact!.url!))).toBe(true);
    expect(npr.message).toMatch(/does not promise we will add it/);
    expect(npr.message).not.toMatch(/when it ships/);
  });

  it("a record's recheck date reaches the block and the text (Columbia PA, 2026-10-24)", () => {
    const columbia = findCountyByFips("42037")!;
    const a = coverageAnswer(columbia, { state: "PA", county: columbia.county, fips: "42037" })!;
    expect(a.recheck).toBe("2026-10-24");
    const lines = a.message.split("\n");
    expect(lines.indexOf("Next check: 2026-10-24")).toBe(lines.indexOf(`Checked: ${columbia.coverage!.checked}`) + 1);
    // Control: a record with no recheck date, and a county with no record, carry null and no line.
    expect(npr.recheck).toBeNull();
    expect(typo.recheck).toBeNull();
    expect(npr.message).not.toMatch(/Next check/);
  });

  it("with no request to offer, says how to name a county instead", () => {
    const none = coverageAnswer(undefined, { state: "", county: "Kane" });
    expect(none.request).toBeNull();
    expect(none.message).toMatch(/name it by its 5-digit FIPS code/);
  });
});

describe("pure: no network, no clock, no randomness", () => {
  afterEach(() => vi.restoreAllMocks());

  it("gives the same answer twice, with fetch, Date.now and Math.random all unavailable", () => {
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("clock read");
    });
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("randomness read");
    });
    vi.stubGlobal("fetch", () => {
      throw new Error("network read");
    });
    try {
      const hillsborough = findCountyByFips("33011")!;
      for (const [record, ref] of [
        [undefined, { state: "TN", county: "Hamiltn" }],
        [hillsborough, { state: "NH", county: "Hillsborough", fips: "33011" }],
      ] as const) {
        const a = coverageAnswer(record, ref);
        expect(coverageAnswer(record, ref)).toEqual(a);
        expect(coverageAnswerText(a!)).toBe(a!.message);
      }
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});

describe("the bundled records carry their coverage", () => {
  const unserved = all.filter((c) => !countyHasEndpoint(c));

  it("finds the counties we do not serve (not vacuous)", () => {
    expect(unserved.length).toBeGreaterThan(0);
  });

  it("every one says why, when we checked, and where its records live", () => {
    const problems = unserved.flatMap((c) => {
      const out: string[] = [];
      if (!c.coverage) out.push(`${c.id}: no coverage`);
      else {
        if (!(COVERAGE_REASONS as readonly string[]).includes(c.coverage.reason)) out.push(`${c.id}: reason ${c.coverage.reason}`);
        if (!c.coverage.summary || c.coverage.summary.length > 280) out.push(`${c.id}: summary`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(c.coverage.checked)) out.push(`${c.id}: checked`);
      }
      if (!c.contact?.url) out.push(`${c.id}: no contact.url`);
      return out;
    });
    expect(problems).toEqual([]);
  });

  it("the answer for each one carries the record's own reason and summary, and a request the endpoint accepts", () => {
    for (const c of unserved) {
      const a = coverageAnswer(c, { state: c.state, county: c.county, fips: c.countyFips });
      expect(a?.status, c.id).toBe("no-public-data");
      expect(a?.reason, c.id).toBe(c.coverage?.reason);
      expect(a?.why, c.id).toBe(c.coverage?.summary);
      expect(a?.county_office?.url, c.id).toBe(c.contact?.url);
      expect(a?.request && parseHintBody(a.request.body).ok, c.id).toBe(true);
    }
  });

  it("no served county carries a coverage block", () => {
    expect(all.filter((c) => countyHasEndpoint(c) && c.coverage).map((c) => c.id)).toEqual([]);
  });
});
