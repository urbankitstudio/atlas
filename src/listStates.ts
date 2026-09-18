import type { StateIndexEntry } from "./types.js";
import { atlas } from "./data.js";

/**
 * List all 50 US states from the atlas index, including those without
 * populated county data yet (use the `populated` flag to filter).
 */
export function listStates(): StateIndexEntry[] {
  return atlas.states;
}
