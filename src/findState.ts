import type { StateFile } from "./types.js";
import { atlas } from "./data.js";

/**
 * Look up a state's full county list by state slug (e.g. "illinois", "new-york").
 * Returns undefined if the state isn't populated in the bundled data yet.
 */
export function findState(stateSlug: string): StateFile | undefined {
  return atlas.byStateSlug.get(stateSlug);
}
