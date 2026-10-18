import type { CountyRecord } from "./types.js";
import { findState } from "./findState.js";

/**
 * Look up a county by state slug and county slug. A two-letter state
 * abbreviation is also accepted, as in findState.
 * Returns undefined if the state isn't populated yet or the county doesn't exist.
 *
 * @example
 * findCounty("illinois", "kane-county")
 *   // → { county: "Kane", endpoints: [...], ... }
 */
export function findCounty(
  stateSlug: string,
  countySlug: string
): CountyRecord | undefined {
  const state = findState(stateSlug);
  if (!state) return undefined;
  return state.counties.find((c) => c.countySlug === countySlug);
}
