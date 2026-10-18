import type { CountyRecord } from "./types.js";
import { findState } from "./findState.js";

/**
 * Return the list of counties the atlas records for a given state slug, served
 * or not (countyHasEndpoint tells them apart). A two-letter state abbreviation
 * is also accepted, as in findState.
 * Returns an empty array if the state isn't populated yet.
 */
export function listCountiesByState(stateSlug: string): CountyRecord[] {
  const state = findState(stateSlug);
  if (!state) return [];
  return state.counties;
}
