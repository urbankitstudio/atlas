import type { CountyRecord, CapabilityField, CapabilityOverrides, EndpointRecord } from "./types.js";

/**
 * Can this layer take a `where`-clause search at all (owner name, address text,
 * a field filter)? False on a layer flagged `attributeSearch: "unsupported"`,
 * which answers SPATIAL queries only: query it by geometry, as its
 * `sampleQuery` shows, and read the owner and address fields off the hits.
 *
 * This is the package's one reader of that flag, so test it rather than the
 * raw field. It is held equal to the site's reader (offersAttributeSearch in
 * the monorepo's src/lib/capability-core.ts) on every bundled endpoint by the
 * monorepo's atlas-package-capability-parity test.
 */
export function offersAttributeSearch(
  endpoint: Pick<EndpointRecord, "attributeSearch"> | null | undefined,
): boolean {
  return !!endpoint && endpoint.attributeSearch !== "unsupported";
}

/**
 * Does ANY of this county's layers take a `where` clause? Miami-Dade answers
 * true through its own layer although its statewide FDOR layer is flagged.
 */
export function countyOffersAttributeSearch(county: Pick<CountyRecord, "endpoints">): boolean {
  const endpoints = Array.isArray(county.endpoints) ? county.endpoints : [];
  return endpoints.some(offersAttributeSearch);
}

/**
 * The reviewed capability assertion for one field, or null when none exists.
 *
 * Null is the common answer and it is not a failure: it means nobody has had to
 * write anything down about that field for that county, so the ordinary rules
 * apply. Read `county.endpoints[].searchFields` to see what the layer actually
 * documents.
 *
 * A non-null answer is the part worth branching on. It was entered by a human
 * who checked something a field list cannot show, and it outranks whatever the
 * field list implies. The clearest case: San Bernardino County publishes an
 * `OwnerName` column, so the field list says owner names are available, and
 * every row's value is the literal string "Protected Per CA Gov Code 7928.205".
 * Only the reviewed record can tell you that.
 */
export function reviewedCapability(
  county: Pick<CountyRecord, "capabilityOverrides">,
  field: CapabilityField,
): NonNullable<CapabilityOverrides[CapabilityField]> | null {
  return county.capabilityOverrides?.[field] ?? null;
}

/**
 * True when a reviewed record says this field cannot be served, whatever the
 * reason. Use it to decide whether to promise a user the field at all.
 *
 * False does NOT mean "available". It means no reviewed record says otherwise,
 * so fall back to the endpoint's documented `searchFields`.
 */
export function isReviewedUnservable(
  county: Pick<CountyRecord, "capabilityOverrides">,
  field: CapabilityField,
): boolean {
  const reviewed = reviewedCapability(county, field);
  return reviewed?.status === "restricted" || reviewed?.status === "not_published";
}
