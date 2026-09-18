import type { EndpointRecord } from "./types.js";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function countySlugFromName(county: string): string {
  const lc = county.toLowerCase();
  const hasSuffix =
    lc.endsWith(" county") ||
    lc.endsWith(" parish") ||
    lc.endsWith(" borough") ||
    lc.endsWith(" census area");
  return slugify(hasSuffix ? county : `${county} County`);
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
