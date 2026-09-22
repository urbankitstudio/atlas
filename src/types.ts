// Types for the County Parcel REST API Atlas.
// Mirrors the source-of-truth shape under public/data/atlas/*.json in the
// urbankitstudio repo.

export type ServiceType = "FeatureServer" | "MapServer";
export type LicenseType = "public" | "open-data" | "restricted" | "unknown";

/**
 * The registry's curation stamp for an endpoint, AS OF THE MOMENT THIS PACKAGE
 * WAS PUBLISHED. It is not a live signal and cannot be — this package ships
 * static JSON and makes no network calls.
 *
 * So `"live"` here means "a check passed before publish", not "this endpoint is
 * up right now". A county can go down the day after a release and every
 * installed copy will keep reporting `"live"` until the next one.
 *
 * For the current answer, query the public health endpoint, which reports what
 * the liveness probe last observed (every two hours) and requires no API key:
 *
 *     GET https://urbankitstudio.com/api/atlas/status?fips=17089
 *
 * A `found: false` there means no observation exists — which is not the same as
 * healthy. See LIVE_STATUS_URL below.
 */
export type EndpointStatus = "live" | "stale" | "unreachable" | "unverified";
export type VerifiedBy = "manual" | "arcgis-hub-seed" | "automated";

/**
 * Where to ask whether an endpoint is actually up right now. Keyless.
 * Omit the query string for every tracked county.
 */
export const LIVE_STATUS_URL = "https://urbankitstudio.com/api/atlas/status";

export interface SearchField {
  name: string;
  label: string;
  searchable: boolean;
}

export interface EndpointRecord {
  url: string;
  serviceType: ServiceType;
  layerIndex: number;
  layerName: string;
  supportsQuery: boolean;
  corsEnabled: boolean | null;
  searchFields: SearchField[];
  sampleQuery: string | null;
  license: LicenseType;
  licenseUrl: string | null;
  /** Publish-time claim, NOT live. See {@link EndpointStatus}. */
  status: EndpointStatus;
  /** ISO date this entry was last verified before publish — a human curation
   *  date, not a probe result, and always at least as old as this release. */
  lastVerified: string;
  verifiedBy: VerifiedBy;
}

export interface ContactInfo {
  department: string;
  url: string | null;
  email: string | null;
}

/** A short curated caveat about a county, written by a human. */
export interface CountyAdvisory {
  body: string;
  source?: { label: string; url: string };
}

/** The fields a caller can ask a county about. */
export type CapabilityField =
  | "apn"
  | "owner_name"
  | "owner_mailing_address"
  | "situs_address"
  | "geometry"
  | "land_use"
  | "zoning";

export type CapabilityStatus = "available" | "not_published" | "restricted" | "unverified";

/**
 * Where a non-available status comes from. The type matters more than the
 * prose, because it tells you whether you are reading a fact about a service, a
 * claim the COUNTY makes, or a claim we make.
 *
 * `county_cited_statute` is the one to read carefully. It means the county
 * publishes that citation as its own reason, reported here attributed to them
 * rather than adopted as our reading of the law. San Bernardino County returns
 * the literal string "Protected Per CA Gov Code 7928.205" in every owner-name
 * row; that section protects the home address of elected and appointed
 * officials, and San Diego County publishes owner names on its public layer.
 * One statute, different county behaviour, so the attribution is not a
 * formality.
 */
export type CapabilityBasisType =
  | "endpoint_schema"
  | "county_cited_statute"
  | "statute"
  | "county_policy";

export interface CapabilityBasis {
  type: CapabilityBasisType;
  /** One sentence you could show a user without editing. */
  note: string;
  citation?: string;
  sourceUrl?: string;
  /** Who makes the claim, when it is not us. Always set for county_cited_statute. */
  attributedTo?: string;
}

/**
 * REVIEWED capability assertions, per field. Only entries a human entered and
 * checked appear here, which is exactly the knowledge you cannot compute from
 * the bundled data yourself.
 *
 * What is NOT here is the mechanical half. Whether a field is simply absent
 * from an endpoint's documented `searchFields` is derivable, and this package
 * deliberately does not derive it: a second implementation of that
 * classification would drift from the one the API bills against, and you would
 * have no way to tell which was right. Read `endpoints[].searchFields` for the
 * mechanical answer, and treat an entry here as outranking it.
 */
export type CapabilityOverrides = Partial<
  Record<
    CapabilityField,
    {
      status: CapabilityStatus;
      basis: CapabilityBasis;
      lawfulAlternativeUrl?: string | null;
    }
  >
>;

export interface CountyRecord {
  id: string;
  state: string;
  stateName: string;
  stateSlug: string;
  county: string;
  countySlug: string;
  countyFips: string | null;
  endpoints: EndpointRecord[];
  contact: ContactInfo | null;
  hasPublicRest: boolean;
  notes: string | null;
  /** Curated caveat about owner data on this county's public layer. */
  ownerFieldNote?: CountyAdvisory | null;
  /** Curated caveat about how old the county's published data is. */
  dataVintage?: CountyAdvisory | null;
  /** Reviewed, per-field capability assertions. See {@link CapabilityOverrides}. */
  capabilityOverrides?: CapabilityOverrides | null;
  relatedZoningCitySlug?: string | null;
  relatedPropertyCitySlug?: string | null;
}

export interface StateFile {
  stateSlug: string;
  stateName: string;
  stateAbbrev: string;
  counties: CountyRecord[];
  lastUpdated: string;
}

export interface StateIndexEntry {
  slug: string;
  name: string;
  abbrev: string;
  countyCount: number;
  endpointCount: number;
  populated: boolean;
}

export interface AtlasIndex {
  version: string;
  lastUpdated: string;
  states: StateIndexEntry[];
  totals: {
    states: number;
    counties: number;
    endpoints: number;
    /** Counties that publish at least one endpoint, i.e. the ones you can
     *  actually query. Distinct from BOTH fields above: counties counts every
     *  indexed county, endpoints counts endpoint RECORDS (a few counties
     *  publish two). Those two coincided at 155/155 while four counties
     *  published none, which is how published copy came to claim 155 verified
     *  endpoints. Prefer this when the sentence is about queryable coverage. */
    countiesWithEndpoint: number;
    /** Counties that publish endpoints the liveness cron can never reach,
     *  because it keys its worklist by countyFips and skips records without
     *  one. SHOULD BE ZERO. Computed over the state files at generation time
     *  and checked by validate-atlas, rather than derived by subtracting a
     *  live health count from this static file - that subtraction let a stale
     *  row cancel a real gap to zero. */
    countiesUnprobeable: number;
  };
}
