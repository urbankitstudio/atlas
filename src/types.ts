// Types for the County Parcel REST API Atlas.
// Mirrors the source-of-truth shape under public/data/atlas/*.json in the
// urbankitstudio repo.

import type { CountyCoverage } from "./coverage.js";

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
  /**
   * The column's fully qualified name on a layer that answers with one (a
   * server-side join publishes `table.column`, as in
   * `SDE.mc_parcel_polygon.TAXPINNO`), while `name` stays the bare last
   * segment. Declared since 0.9.0 and carried by NO record yet: the registry's
   * validator refuses it until a later release, so `name` is the literal query
   * column on every record today. Read the column to send through
   * `queryFieldName(field)`, exported by this package, so your code is already
   * right when a record does carry one.
   */
  wireName?: string;
}

/**
 * Owner rows that live in a separate TABLE of the same service, joined to the
 * endpoint's parcel polygons by a key: the polygons carry `parcelKey`, the
 * table carries `key`, and a parcel's owners are the table rows whose `key`
 * equals its `parcelKey` value. Declared since 0.9.0; Sussex County, Delaware
 * (0.9.1) is the first record that carries one.
 *
 * The table has no geometry. Query it by key only
 * (`<key> IN ('<value>', ...)`, each `'` doubled), never spatially: an ArcGIS
 * table ignores a geometry parameter, so a spatial query would answer with
 * arbitrary rows. Check that every returned row's `key` is one you asked for.
 *
 * The table's columns live ONLY in `fields`, never in the endpoint's
 * `searchFields`. So a reader that ignores `ownerJoin` sees a layer with a
 * parcel id and no owner, which is the safe reading: it cannot ask the polygon
 * layer for a column that is not on it.
 */
export interface OwnerJoin {
  /** The table's layer URL: another layer of the endpoint's own service (the
   *  same host and service path; `MapServer` and `FeatureServer` are one
   *  service). No endpoint `url` in the registry names this layer, under
   *  either service type. */
  url: string;
  layerName: string;
  /** The key column on the table. */
  key: string;
  /** The matching column on the endpoint's layer; one of its `searchFields`. */
  parcelKey: string;
  /** The table's documented columns: `key`, `rowIdField` and the owner columns. */
  fields: SearchField[];
  /** A column that labels the rows of one key (an assessment unit, say). It is
   *  NOT unique: several rows can share one value and differ only in columns
   *  that are not served. De-duplicate the rows of one key by the owner and
   *  mailing content you read, never by this column. */
  rowIdField?: string;
  /** `"rows"`: a key with several rows stands for several ownership records,
   *  up to `maxRowsPerKey` of them. Absent: treat a key with several rows as
   *  having no single owner rather than picking one. */
  multiple?: "rows";
  /** The most distinct ownership rows one key may hold and still be read as its
   *  ownership records: an integer from 1 to `maxRecordCount`, present exactly
   *  when `multiple` is `"rows"`. Count a key's rows after de-duplicating them
   *  by the owner and mailing content you read and dropping any row that says
   *  nothing another row of the key does not. Treat a key with more than that
   *  as having no owner you can state (a single key can hold more rows than one
   *  query returns). */
  maxRowsPerKey?: number;
  /** A unique, stable column to order the table's pages by: send it as
   *  `orderByFields` whenever you send `resultOffset`, or a paged read can
   *  repeat a row or skip one. */
  orderField: string;
  /** The most rows the table returns to one query, as its metadata declares;
   *  `exceededTransferLimit` on the response is the authority. */
  maxRecordCount: number;
  /** ISO date the table and its key were last verified before publish. */
  lastVerified: string;
}

/**
 * The county's own "this owner's record is confidential" column on a layer, the
 * values that say so, and the raw cells measured as safe. Texas Tax Code §25.025
 * lets peace officers, judges, family-violence victims and others have their
 * home address kept confidential in appraisal records; Harris (HCAD) and Collin
 * publish the owner anyway with a flag column beside it (`confidential_flag`
 * "Y", `GIS_DBO_AD_Entity_confidential_` "T"); Ector's (`conf_flg` "1") is the
 * recorded guess, since no flagged row had been observed when it was measured.
 * A row whose flag is set must not be shown or passed on.
 *
 * The rule: keep a row only if its raw cell equals one of `safeValues` AND the
 * cell, trimmed and upper-cased, contains no listed value; a NULL or missing
 * cell is flagged. In SQL that is two clauses ANDed to every query against the
 * layer. First, one per value: for a ONE-character value
 * `AND CAST(<field> AS VARCHAR(255)) NOT LIKE '%<value>%'` (HCAD packs one flag
 * per ownership slot into a ten-character string, so "YNNNNNNNNN" is slot 1
 * confidential and an equality test would keep it; Collin's "T" takes this
 * form too), for a longer value `AND CAST(<field> AS VARCHAR(255)) <> '<value>'`.
 * The CAST is required: Ector's `conf_flg` is an integer and an un-cast LIKE
 * answers there with an ArcGIS error (code 400, inside an HTTP 200 response).
 * Never TRIM the column in SQL: `TRIM(<field>)` answers with the same error on
 * all three layers, so the SQL route compares the untrimmed text
 * (`UPPER(CAST(<field> AS VARCHAR(255)))` does run). Then
 * `AND <field> IN (<safeValues>)`: a contains test written in SQL cannot match
 * the rule on every county backend (non-ASCII upper-casing, an embedded NUL
 * that stops LIKE, the 255-character cast, mixed encodings), so a cell that is
 * not exactly a known-safe value drops out whatever the backend does with
 * text. Each record's `sampleQuery` carries both clauses. Harris's 470,972
 * blank cells hold spaces and both clauses keep them; Harris also has 5,235
 * NULL cells and Collin 15,003 (2026-10-25). A NULL cell fails both clauses
 * and the row drops out; a missing column makes the query fail. That is
 * fail-closed. Since 0.6.47 the hosted reader (the hosted API, the hosted MCP
 * and the site's free tools) keeps the same rows, plus unpadded or
 * whitespace-wrapped forms of a safe cell, none of which can carry a marker: it
 * ignores trailing spaces (U+0020) on both sides of a string safe value,
 * matches an integer safe value against text that trims (JavaScript `trim`) to
 * its decimal form, withholds a cell that holds a listed value anywhere in it,
 * whatever that value's length, and withholds every row of a layer whose flag
 * lists no safe values. Or apply the rule to each row yourself. Request the
 * column whenever you request the owner. The hosted API and MCP withhold a
 * flagged row with `withheld: "county-redacted"`.
 */
export interface ConfidentialFlag {
  field: string;
  values: string[];
  /**
   * The exact raw cells the layer holds for an UNFLAGGED owner, strings with
   * their padding and integers for an integer column (measured 2026-10-26 with
   * returnDistinctValues: Harris `["          ", "N         ", "NNN       ",
   * "NNNNNNNNNN"]`, each ten characters; Collin `["F"]`; Ector `[0]`). In SQL,
   * `<field> IN ('          ', 'N         ', ...)`: strings single-quoted with
   * `'` doubled, integers bare, in the listed order, the column neither cast
   * nor upper-cased. validate-atlas requires it on every record that carries a
   * confidentialFlag (since 0.6.46); it is optional in the type so data older
   * than that still type-checks.
   */
  safeValues?: Array<string | number>;
}

export interface EndpointRecord {
  url: string;
  serviceType: ServiceType;
  layerIndex: number;
  layerName: string;
  supportsQuery: boolean;
  corsEnabled: boolean | null;
  searchFields: SearchField[];
  /** ANDed into every ATTRIBUTE search against this endpoint. Only needed when
   *  one endpoint serves several counties - NYC's MAPPLUTO layer carries all
   *  five boroughs, so without this a Brooklyn owner search returns Queens
   *  parcels. Spatial lookups do not need it: the buffer already sits on the
   *  address, which is why the paid enrichment path is unaffected. */
  scopeWhere?: string;
  /**
   * Declares that the SERVICE this layer sits on is not this county's alone: a
   * statewide service one county registers (Vermont's VCGI by Chittenden,
   * Hawaii's ParcelsZoning by Kauai, Denver's and Anchorage's statewide
   * composites), whose other layers may be any county's. A consumer that maps
   * an unregistered layer of a service to the county registering it must not
   * for a marked one. Only `true` is written; absent is the other value.
   */
  sharedService?: true;
  /**
   * Declares that this layer CANNOT serve an ATTRIBUTE search - a `where`-clause
   * query on a column, which is what "search by owner name / APN / address text"
   * means everywhere on the site. Absent (the default, and true of every
   * registration except 68: the 67 Florida counties on the shared FDOR layer,
   * see below, and Orleans Parish LA, whose own layer never finishes a table
   * scan) means an attribute search IS offered.
   *
   * Read it through `offersAttributeSearch` / `countyOffersAttributeSearch`,
   * exported by this package, rather than comparing the string yourself.
   *
   * THIS IS THE ONE FLAG. Do not add a second field, and do not express this
   * with `searchable: false` on every column: `searchable` is a FIELD-level
   * record of whether a `where` clause may name that column (the generator sets
   * it from the column's type), it is set inconsistently by hand, and six
   * different owner-capability rules already read it. This says something
   * different and says it once, at the level where it is true - the endpoint.
   *
   * Honoured by `offersAttributeSearch` / `countyOffersAttributeSearch` in
   * capability-core.ts, which every surface that DESCRIBES a search must go
   * through. Field-availability functions deliberately do NOT read it: a layer
   * flagged here still answers owner and address fields SPATIALLY, which is
   * what the billed lookup, bulk enrichment and radius paths use, so flipping
   * owner_name to not_published would be a false claim about data we do serve
   * and do bill for. Search and availability are different questions.
   *
   * THE SHARED-LAYER CASE, and what would retire it. Florida's FDOR statewide
   * cadastral layer carries all 67 counties and 10.8M parcels, and CO_NO - the
   * county code, the only column identifying a county, and therefore every
   * Florida registration's scopeWhere - is NOT INDEXED. Its declared indexes
   * are OBJECTID, Shape, Shape__Area, Shape__Length and PARCEL_ID. A
   * county-scoped attribute search therefore scans the roll from the top:
   * measured across all 67 counties on 2026-09-20, only 4 answered inside 12s
   * and the rest hit the service's ~55s ceiling. The conjunct poisons an
   * indexed predicate too - PARCEL_ID LIKE '00%' alone answers in 0.9s, and
   * `CO_NO=77 AND PARCEL_ID LIKE '00%'` times out - so there is no cheaper
   * column to scope on. Dropping the scope is not an option either: an unscoped
   * attribute search on a shared layer answers with every other county's
   * parcels, which is exactly what shared-endpoint-scope.test.ts forbids.
   * Scoped is unaffordable and unscoped is wrong, so attribute search is not
   * offered at all.
   *
   * IF FDOR EVER INDEXES CO_NO, delete the flag from those 67 endpoint records
   * and every surface re-offers the search on its own. Nothing else changes.
   */
  attributeSearch?: "unsupported";
  /**
   * Declares that this layer REFUSES pagination: any `resultRecordCount` or
   * `resultOffset` in a query (in any letter case) gets HTTP 200 with
   * `{"error":{"code":400,"message":"Pagination is not supported."}}`. Only the
   * literal `false` is allowed; absent (true of every other registration) means
   * the layer pages. Named after Esri's own
   * `advancedQueryCapabilities.supportsPagination`.
   *
   * On a flagged layer send ONE request with neither parameter. It returns at
   * most `maxRecordCount` rows and sets `exceededTransferLimit` when more
   * matched, so narrow the `where` clause or the geometry instead of paging.
   * The layer's `sampleQuery` already has that shape.
   *
   * Read it through `offersPagination`, exported by this package, rather than
   * comparing the value yourself.
   */
  supportsPagination?: false;
  /** The most rows the layer returns to one query, as its metadata declares.
   *  Present on every layer flagged `supportsPagination: false`. A declared
   *  value: the server's real cap can change, and `exceededTransferLimit` on
   *  the response is the authority on whether a result was cut. */
  maxRecordCount?: number;
  /** The layer's own confidential-owner flag column (see {@link ConfidentialFlag}).
   *  Present on tx-harris, tx-collin and tx-ector (Ector's marker is the
   *  recorded guess: no flagged row observed yet), each with its measured
   *  `safeValues`. Absent means the layer publishes no
   *  such column, not that no owner there is protected. */
  confidentialFlag?: ConfidentialFlag;
  /** The table that holds this layer's owner rows (see {@link OwnerJoin}).
   *  Declared since 0.9.0; carried by Sussex County, Delaware since 0.9.1 and
   *  absent on every other record. */
  ownerJoin?: OwnerJoin;
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
 *
 * `permission_pending` is a claim we make about ourselves: the county publishes
 * this field; we have asked it for permission to use it and withhold the field
 * until it answers. It says nothing about the law or the county's policy. It
 * always comes with status `restricted`, on a field the layer documents, and
 * the `note` says when we asked. Expect it to flip to `available` (no basis)
 * when the county says yes.
 */
export type CapabilityBasisType =
  | "endpoint_schema"
  | "county_cited_statute"
  | "statute"
  | "county_policy"
  | "permission_pending";

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
 * mechanical answer, plus `endpoints[].ownerJoin.fields` on a layer whose owner
 * rows sit in a joined table (see {@link OwnerJoin}), and treat an entry here
 * as outranking it.
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
  /**
   * The statement the publisher's terms require or request wherever its data is
   * shown, verbatim and never shortened: a credit line (0.6.42: the ten Colorado
   * counties on the State's service, San Francisco CA) or a required disclaimer
   * (Greene MO, the City of Springfield's "Use of Data" clause). Show it beside
   * the county's results and on the county's page as is; the record's `notes`
   * carry the same text after "Credit:". Absent when the terms name none.
   */
  credit?: string;
  /**
   * The date (YYYY-MM-DD) this county entered the atlas. Optional: records
   * added before 2026-10-05 carry no date. Unlike `lastVerified` on each
   * endpoint, which moves on every re-verification, this never moves.
   */
  addedAt?: string | null;
  /** Curated caveat about owner data on this county's public layer. */
  ownerFieldNote?: CountyAdvisory | null;
  /** Curated caveat about how old the county's published data is. */
  dataVintage?: CountyAdvisory | null;
  /** Reviewed, per-field capability assertions. See {@link CapabilityOverrides}. */
  capabilityOverrides?: CapabilityOverrides | null;
  /**
   * Why we cannot index this county, as a reason code and one sentence. Set on
   * every record with `hasPublicRest: false` from 0.6.38; read it through
   * `coverageAnswer()`.
   */
  coverage?: CountyCoverage | null;
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
