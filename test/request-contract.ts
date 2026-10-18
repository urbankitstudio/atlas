/**
 * The county request contract, restated for this package's tests: the keys a
 * request hint may carry, as POST /api/atlas/request and the hosted
 * request_county tool accept them, and what each value must look like.
 *
 * The endpoint's parser lives in the private monorepo
 * (src/lib/county-request-core.ts, parseCountyRequestBody). This file is not a
 * copy of its code (that would publish the server's input handling with this
 * package); it states the same rules for the five hint keys, and the monorepo
 * test coverage-request-contract.test.ts holds the two to the same verdict and
 * the same stored value on every hint body and on a corpus of hostile ones.
 *
 * A hint never carries the optional keys a person adds (requester_email, note,
 * source_url), so a body with any key outside the five is refused here.
 */
import { stateSlugFromAbbrev } from "../src/coverage.js";

export const HINT_KEYS = ["county_fips", "county_name", "state_abbrev", "state_slug", "county_slug"] as const;

export type ContractParse = { ok: true; value: Record<string, string> } | { ok: false; error: string };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Absent, null and blank are "not given"; any other non-string is an error (null here). */
function given(v: unknown): { value: string } | false | null {
  if (v === undefined || v === null) return false;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? false : { value: t };
}

/** A C0 control other than tab, LF and CR, or a lone UTF-16 surrogate. */
function hasUnstorable(s: string): boolean {
  const codes = Array.from(s, (ch) => ch.codePointAt(0)!);
  return codes.some((c) => (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) || (c >= 0xd800 && c <= 0xdfff));
}

export function parseHintBody(body: Record<string, unknown>): ContractParse {
  for (const key of Object.keys(body)) {
    if (!(HINT_KEYS as readonly string[]).includes(key)) return { ok: false, error: `not-a-hint-key:${key}` };
  }
  const value: Record<string, string> = {};

  const fips = given(body.county_fips);
  if (fips === null || (fips && !/^[0-9]{5}$/.test(fips.value))) return { ok: false, error: "invalid-fips" };
  if (fips) value.county_fips = fips.value;

  for (const key of ["state_slug", "county_slug"] as const) {
    const s = given(body[key]);
    if (s === null) return { ok: false, error: "invalid-slug" };
    if (!s) continue;
    const slug = s.value.toLowerCase();
    if (slug.length > 64 || !SLUG_RE.test(slug)) return { ok: false, error: "invalid-slug" };
    // A known state abbreviation is stored as the atlas slug: "tn" as "tennessee".
    value[key] = key === "state_slug" ? stateSlugFromAbbrev(slug) ?? slug : slug;
  }
  if (!value.county_fips && !(value.state_slug && value.county_slug)) return { ok: false, error: "county-required" };

  const name = given(body.county_name);
  if (name === null) return { ok: false, error: "invalid-county-name" };
  if (name) {
    if (hasUnstorable(name.value)) return { ok: false, error: "invalid-county-name" };
    const n = name.value.replace(/\p{Cf}/gu, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
    if (n.length > 80) return { ok: false, error: "invalid-county-name" };
    if (n) value.county_name = n;
  }

  const abbrev = given(body.state_abbrev);
  if (abbrev === null || (abbrev && !/^[A-Za-z]{2}$/.test(abbrev.value))) return { ok: false, error: "invalid-state-abbrev" };
  if (abbrev) value.state_abbrev = abbrev.value.toUpperCase();

  return { ok: true, value };
}
