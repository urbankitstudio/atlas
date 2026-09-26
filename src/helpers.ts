import type { EndpointRecord } from "./types.js";

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

export function buildParcelLookupDeepLink(
  endpoint: EndpointRecord,
  base = "https://urbankitstudio.com/tools/parcel-lookup"
): string {
  const params = new URLSearchParams();
  params.set("endpoint", endpoint.url);
  const ownerField = endpoint.searchFields.find((f) =>
    /owner|taxpayer/i.test(f.name)
  );
  if (ownerField) params.set("fieldHint", ownerField.name);
  return `${base}?${params.toString()}`;
}

export function statePath(stateSlug: string): string {
  return `/parcel-atlas/${stateSlug}`;
}

export function countyPath(stateSlug: string, countySlug: string): string {
  return `/parcel-atlas/${stateSlug}/${countySlug}`;
}
