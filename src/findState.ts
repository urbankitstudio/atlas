import type { StateFile } from "./types.js";
import { atlas } from "./data.js";
import { stateSlugFromAbbrev } from "./coverage.js";

/**
 * Look up a state's full county list by state slug (e.g. "illinois", "new-york").
 * A two-letter abbreviation is also accepted ("IL", "ny"): the 50 states and DC
 * read as their slug, by the same rule as the hosted MCP and REST API, and any
 * other input is read as a slug unchanged.
 * Returns undefined if the state isn't populated in the bundled data yet.
 */
export function findState(stateSlug: string): StateFile | undefined {
  return atlas.byStateSlug.get(stateSlugFromAbbrev(stateSlug) ?? stateSlug);
}
