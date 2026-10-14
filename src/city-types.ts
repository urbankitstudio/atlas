// Types for the city data registries: code violations and building permits
// (public/data/city-property/*.json in the urbankitstudio repo, src/lib/
// city-property.ts) and zoning cases (public/data/city-zoning/*.json,
// src/lib/city-zoning.ts). Mirrors those shapes exactly; the monorepo's
// atlas-package-city-parity test pins the pairs type-identical.

// --------------------------------------------------------------- property --

export type PropertySourceType = "socrata" | "arcgis" | "ckan" | "carto";

/**
 * Canonical field names the site's Property Report renders. A city's source
 * response is mapped onto these by the per-dataset field map, so no provider's
 * column names are hard-coded anywhere. `address` is the column searched.
 */
export interface PropertyFieldMap {
  address: string;
  /** Ordered columns composed into the display address when the table splits the street. */
  addressParts?: string[];
  /**
   * Column holding the street NUMBER on its own. When set, a typed "number
   * name" street is matched as `address LIKE %name% AND streetNumber = number`,
   * and a name typed without a number is matched on the name alone, with the
   * same leading-direction and trailing-type trimming; unset, the search is the
   * plain substring match.
   */
  streetNumber?: string;
  recordNumber?: string;
  type?: string;
  description?: string;
  status?: string;
  contractor?: string;
  value?: string;
  openedDate?: string;
  closedDate?: string;
  zip?: string;
  link?: string;
}

export interface PropertyStatusBuckets {
  active?: string[];
  closed?: string[];
}

export type DatasetKind = "violations" | "permits";

export interface PropertyDataset {
  kind: DatasetKind;
  tabLabel: string;
  type: PropertySourceType;
  /**
   * Socrata: the resource .json URL. ArcGIS: the layer URL (.../FeatureServer/0).
   * CKAN: the portal base URL; resourceId names the datastore resource. CARTO:
   * the SQL-API host; resourceId names the table.
   */
  url: string;
  resourceId?: string;
  /** Column to sort by newest-first server-side. Absent for text dates that cannot sort. */
  orderField?: string;
  /** Extra filter ANDed into every query (SoQL, SQL, or an ArcGIS WHERE expression). */
  where?: string;
  /** How the streetNumber column is typed at the source. Default "text". */
  streetNumberType?: "text" | "number";
  /**
   * Set only on a table measured to store a run of spaces after the house number
   * (Orlando): the longest run to try, 1 to 8. The address search then ORs the typed
   * text with 1..N spaces in that gap; unset, it matches the typed spacing exactly.
   */
  houseNumberSpaceRuns?: number;
  /** The newest value of the date column seen at the last verification (YYYY-MM-DD). */
  latestRecordDate?: string;
  /** One sober line stating the time span the dataset actually covers. */
  coverage: string;
  recordLabel?: string;
  openedLabel?: string;
  closedLabel?: string;
  fields: PropertyFieldMap;
  statusBuckets?: PropertyStatusBuckets;
}

export interface PropertyDatasets {
  violations?: PropertyDataset;
  permits?: PropertyDataset;
}

export interface PropertySource {
  name: string;
  url: string;
  license?: string;
  portalLabel?: string;
  currentRecordsNote?: string;
  currentRecordsUrl?: string;
}

export interface CityPropertyRecord {
  slug: string;
  city: string;
  state: string;
  stateAbbrev: string;
  countyName?: string;
  countySlug?: string;
  lastVerified: string;
  /** Clarifies the data is city-scoped, not county-wide. */
  scopeNote?: string;
  datasets: PropertyDatasets;
  source: PropertySource;
}

export interface CityPropertyIndexEntry {
  slug: string;
  city: string;
  state: string;
  stateAbbrev: string;
  populated: boolean;
  provider: string;
  countyName?: string;
  countySlug?: string;
  /** The dataset kinds the city's file declares. */
  datasets?: DatasetKind[];
  note?: string;
}

export interface CityPropertyIndex {
  lastUpdated: string;
  cities: CityPropertyIndexEntry[];
}

// ----------------------------------------------------------------- zoning --

export type ZoningSourceType = "socrata" | "arcgis";

/**
 * "cases": an address-searchable rezoning case log. "current-zoning": no case
 * log is published, but the current zoning map is; the lookup geocodes the
 * address and intersects the base-zoning layer.
 */
export type ZoningToolKind = "cases" | "current-zoning";

export interface CaseFieldMap {
  caseNumber?: string;
  caseName?: string;
  /** The address text column. Required for address lookups; absent for polygon-only dockets. */
  address?: string;
  addressParts?: string[];
  caseType?: string;
  status?: string;
  proposedZoning?: string;
  existingZoning?: string;
  proposedLandUse?: string;
  existingLandUse?: string;
  ownerName?: string;
  ownerOrg?: string;
  appliedDate?: string;
  statusDate?: string;
  district?: string;
  link?: string;
}

export interface ZoningStatusBuckets {
  active?: string[];
  approved?: string[];
  closed?: string[];
}

export interface CasesSource {
  type: ZoningSourceType;
  url: string;
  orderField?: string;
  fields: CaseFieldMap;
  /**
   * "address" (default): LIKE on the mapped address column. "location":
   * geocode to a point and let the server answer point-in-polygon. "parcel":
   * resolve the address to a parcel id, join through a crosswalk dataset.
   */
  lookup?: "address" | "location" | "parcel";
  /** As on PropertyDataset: the longest run of spaces after the house number to try, set only where measured. */
  houseNumberSpaceRuns?: number;
  geocoder?: GeocoderConfig;
  resolver?: { provider: "nyc-geosearch" };
  crosswalk?: { url: string; parcelField: string; projectField: string };
  joinField?: string;
  /** What this docket honestly is ("zoning and rezoning cases" by default). */
  caseLabel?: string;
  where?: string;
  nullSentinels?: string[];
  statusBuckets?: ZoningStatusBuckets;
  /** The newest value of the date column seen at the last verification (YYYY-MM-DD). */
  latestRecordDate?: string;
}

export interface ZoningByAddressSource {
  type: ZoningSourceType;
  url: string;
  fields: {
    address: string;
    baseZone: string;
    baseZoneCategory?: string;
    zoneType?: string;
  };
}

export type GeocoderProvider = "nominatim" | "census";

export interface GeocoderConfig {
  provider: GeocoderProvider;
  context: string;
}

export interface CurrentZoningFieldMap {
  zoneDist: string;
  longZoneDist?: string;
  pdNum?: string;
  caseNumber?: string;
  effectiveDate?: string;
  districtUse?: string;
}

export interface CurrentZoningSource {
  type: "arcgis";
  url: string;
  geocoder: GeocoderConfig;
  fields: CurrentZoningFieldMap;
}

export interface CitySource {
  name: string;
  url: string;
  datasetUrl?: string;
  license?: string;
  portalLabel?: string;
  currentRecordsNote?: string;
}

export interface CityZoningRecord {
  slug: string;
  city: string;
  state: string;
  stateAbbrev: string;
  countyName?: string;
  countySlug?: string;
  lastVerified: string;
  /** Absent means "cases". */
  kind?: ZoningToolKind;
  cases?: CasesSource;
  currentZoning?: CurrentZoningSource;
  zoningByAddress?: ZoningByAddressSource;
  zoneGlossary?: Record<string, string>;
  source: CitySource;
}

export interface CityZoningIndexEntry {
  slug: string;
  city: string;
  state: string;
  stateAbbrev: string;
  populated: boolean;
  provider: string;
  countyName?: string;
  countySlug?: string;
  note?: string;
}

export interface CityZoningIndex {
  lastUpdated: string;
  cities: CityZoningIndexEntry[];
}
