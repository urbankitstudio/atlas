import type { CountyRecord } from "./types.js";
import { atlas } from "./data.js";

/**
 * Return the list of counties with mapped REST endpoints for a given state slug.
 * Returns an empty array if the state isn't populated yet.
 */
export function listCountiesByState(stateSlug: string): CountyRecord[] {
  const state = atlas.byStateSlug.get(stateSlug);
  if (!state) return [];
  return state.counties;
}
