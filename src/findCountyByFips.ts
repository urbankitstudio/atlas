import type { CountyRecord } from "./types.js";
import { atlas } from "./data.js";

/**
 * Look up a county by its 5-digit county FIPS code (state FIPS + county FIPS,
 * e.g. "17089" for Kane County, IL). Scans all populated states.
 * Returns undefined if the FIPS isn't a 5-digit string or no county matches.
 *
 * @example
 * findCountyByFips("17089")
 *   // → { county: "Kane", stateSlug: "illinois", endpoints: [...], ... }
 */
export function findCountyByFips(fips: string): CountyRecord | undefined {
  if (typeof fips !== "string" || !/^\d{5}$/.test(fips)) return undefined;
  for (const state of atlas.byStateSlug.values()) {
    const match = state.counties.find((c) => c.countyFips === fips);
    if (match) return match;
  }
  return undefined;
}
