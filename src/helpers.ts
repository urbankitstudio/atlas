import type { EndpointRecord } from "./types.js";
import { offersAttributeSearch } from "./capability.js";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The site's rule (countyDisplayName in urbankitstudio's src/lib/atlas.ts): a
// name that already carries its unit type ("Orleans Parish", "Anchorage
// Municipality", "Capitol Planning Region", "Statewide", "District of
// Columbia") is slugged as it stands; any other name gets " County". Until
// 0.6.9 this copy knew four units and returned "anchorage-municipality-county"
// for a record stored as "anchorage-municipality". The site repo's
// atlas-package-slug-parity.test.ts holds the two copies equal.
const COUNTY_UNIT_SUFFIX =
  /\b(?:County|Parish|Borough|Municipality|Census Area|City|Statewide|Planning Region|District of Columbia)$/i;

export function countySlugFromName(county: string): string {
  const name = county.trim();
  return slugify(COUNTY_UNIT_SUFFIX.test(name) ? name : `${name} County`);
}

/**
 * One spelling for one ArcGIS layer, so two spellings of the same layer compare
 * equal. A URL that parses as http(s) keys on host + path, with no scheme (an
 * http and an https spelling are one layer): the host lowercased, a default
 * port dropped, dot segments resolved, repeated slashes collapsed, the query
 * string and fragment dropped, a trailing `/query` (the operation, not the
 * layer) and trailing slashes stripped, and the path lowercased, since ArcGIS
 * REST paths are case-insensitive. Anything else is trimmed, stripped of
 * trailing slashes and lowercased. Distinct layers stay distinct:
 * `MapServer/15`, `MapServer/1` and `MapServer/150` are three keys.
 *
 * The site's copy (layerKey in the monorepo's src/lib/registered-layer.ts) is
 * held equal to this one by its registered-layer test.
 */
export function canonicalLayerUrl(url: string): string {
  const raw = url.trim();
  let parsed: URL | null;
  try {
    parsed = new URL(raw);
  } catch {
    parsed = null;
  }
  if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
    return raw.replace(/\/+$/, "").toLowerCase();
  }
  const path = parsed.pathname
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "")
    .replace(/\/query$/i, "")
    .replace(/\/+$/, "");
  const port = parsed.port ? `:${parsed.port}` : "";
  return `${parsed.hostname}${port}${path}`.toLowerCase();
}

/**
 * The county a deep link is for. A CountyRecord satisfies it. Pass the record
 * with its `endpoints` so the link can tell whether the endpoint is the
 * county's primary layer; without them the caller vouches that it is.
 */
export interface DeepLinkCounty {
  stateSlug: string;
  countySlug: string;
  endpoints?: readonly Pick<EndpointRecord, "url">[];
}

/**
 * A link into the UrbanKit parcel-lookup tool for one endpoint.
 *
 * Without `county` this is the generic `?endpoint=<url>` link it always was,
 * except that `fieldHint` (the owner column to pre-select) is omitted on a
 * layer that refuses typed search (`attributeSearch: "unsupported"`): there is
 * no text search to pre-select a field for, and the generic route recognises
 * a registry-flagged layer and offers none.
 *
 * With `county` (pass the CountyRecord itself), a flagged or SHARED layer
 * (`scopeWhere` set) links to the county route `<base>/<state>/<county>`, but
 * only when it IS the county's primary layer (`county.endpoints[0]`, compared
 * by canonicalLayerUrl), because the county route always loads that one. Only
 * the county route knows which county it is looking at, so only it can scope a
 * shared layer and show a flagged layer as lookup by location. Any other
 * endpoint keeps the generic link to exactly that endpoint: Broward's FDOR
 * layer is its second, behind the county's own layer, so a county-route link
 * for it would open a different layer.
 */
export function buildParcelLookupDeepLink(
  endpoint: EndpointRecord,
  base = "https://urbankitstudio.com/tools/parcel-lookup",
  county?: DeepLinkCounty
): string {
  const searchable = offersAttributeSearch(endpoint);
  const primary = county?.endpoints ? county.endpoints[0] : endpoint;
  const isPrimary = !!primary && canonicalLayerUrl(primary.url) === canonicalLayerUrl(endpoint.url);
  if (county && isPrimary && (!searchable || endpoint.scopeWhere)) {
    return `${base}/${encodeURIComponent(county.stateSlug)}/${encodeURIComponent(county.countySlug)}`;
  }
  const params = new URLSearchParams();
  params.set("endpoint", endpoint.url);
  const ownerField = searchable
    ? endpoint.searchFields.find((f) => /owner|taxpayer/i.test(f.name))
    : undefined;
  if (ownerField) params.set("fieldHint", ownerField.name);
  return `${base}?${params.toString()}`;
}

export function statePath(stateSlug: string): string {
  return `/parcel-atlas/${stateSlug}`;
}

export function countyPath(stateSlug: string, countySlug: string): string {
  return `/parcel-atlas/${stateSlug}/${countySlug}`;
}
