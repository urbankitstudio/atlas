export type {
  ServiceType,
  LicenseType,
  EndpointStatus,
  VerifiedBy,
  SearchField,
  EndpointRecord,
  ContactInfo,
  CountyRecord,
  StateFile,
  StateIndexEntry,
  AtlasIndex,
  CountyAdvisory,
  CapabilityField,
  CapabilityStatus,
  CapabilityBasisType,
  CapabilityBasis,
  CapabilityOverrides,
} from "./types.js";

// Reviewed, human-entered capability assertions. This package deliberately does
// NOT derive the mechanical half; see CapabilityOverrides in types.ts for why.
export {
  reviewedCapability,
  isReviewedUnservable,
  offersAttributeSearch,
  countyOffersAttributeSearch,
  offersPagination,
} from "./capability.js";

// The bundled `status` field is a publish-time claim; this is where to ask what
// is true now. Exported as a value so consumers do not hardcode the URL.
export { LIVE_STATUS_URL } from "./types.js";

// Why a county is not served, and how to ask for it: the same answer the
// hosted MCP, the REST API and the `uks` CLI give.
export {
  COVERAGE_REASONS,
  COUNTY_REQUEST_URL,
  COUNTY_REQUEST_MESSAGE,
  COUNTY_RECHECK_REQUEST_MESSAGE,
  NOT_IN_ATLAS_WHY,
  NO_PUBLIC_DATA_WHY,
  countyHasEndpoint,
  coverageAnswer,
  coverageAnswerText,
  coverageOverridesPause,
  requestHint,
} from "./coverage.js";
export type {
  CoverageReason,
  CoverageStatus,
  CountyCoverage,
  CountyProduct,
  CoverageAnswer,
  CoverageTextInput,
  CoverageRecordLike,
  EndpointPresenceLike,
  CountyRequestRef,
  CountyRequestHint,
} from "./coverage.js";

// A county in the atlas that is paused (its terms or a law forbid a use): the
// surface flags, the presets, the reasons and the answer the hosted MCP, the
// REST API and the `uks` CLI give. Which counties are paused is live data from
// the hosted API (/api/atlas/status), not bundled here, so a pause or un-pause
// needs no release. countyDownMessage is the one sentence for a county whose
// own server is down (observed health, or a county-side query failure).
export {
  ACCESS_FLAGS,
  ACCESS_PRESETS,
  ACCESS_REASONS,
  ATLAS_COUNTY_PAGE_BASE,
  PRESET_FLAGS,
  accessBlocks,
  countyDownMessage,
  flagsFor,
  pausedAnswer,
  pausedFlags,
  presetOf,
} from "./access.js";
export type {
  AccessFlag,
  AccessFlags,
  AccessPreset,
  AccessReason,
  AccessRecordLike,
  AccessPageRef,
  CountyAccessEntry,
  CountyPausedAnswer,
} from "./access.js";

export { findCounty } from "./findCounty.js";
export { findCountyByFips } from "./findCountyByFips.js";
export { findState } from "./findState.js";
export { listStates } from "./listStates.js";
export { listCountiesByState } from "./listCountiesByState.js";

export {
  slugify,
  countySlugFromName,
  buildParcelLookupDeepLink,
  canonicalLayerUrl,
  statePath,
  countyPath,
} from "./helpers.js";

export type { DeepLinkCounty } from "./helpers.js";

export { atlas, atlasIndex } from "./data.js";
export type { Atlas } from "./data.js";

// City datasets: code violations, building permits and zoning cases for the
// cities UrbanKit has verified, with the exact query the site sends. Bundled
// like the atlas; nothing fetches. County records' relatedZoningCitySlug and
// relatedPropertyCitySlug resolve through getCityZoning / getCityProperty.
export {
  listCities,
  findCity,
  getCityProperty,
  getCityZoning,
  cityDatasets,
  buildCityQuery,
  citiesForCounty,
  cityPath,
  // The pure halves, for callers that bring their own index (the hosted MCP).
  mergeCityIndexes,
  findCityIn,
  citiesForCountyIn,
  cityDatasetDescriptors,
  splitStreet,
  splitAddressStreetName,
  streetForDataset,
  propertyQueryUrl,
  casesQueryUrl,
  casesLocationTemplate,
  currentZoningTemplate,
  CITY_RECORD_LIMIT,
  CITY_STREET_MAX_LEN,
  POINT_PLACEHOLDER,
} from "./cities.js";
export type {
  CityFilter,
  CityKind,
  CitySummary,
  CityDatasetDescriptor,
  CityQueryTemplate,
  CityProvider,
  CityLookup,
  SplitStreet,
} from "./cities.js";
export type {
  CityPropertyRecord,
  CityPropertyIndexEntry,
  CityPropertyIndex,
  PropertyDataset,
  PropertyDatasets,
  PropertyFieldMap,
  PropertySource,
  PropertySourceType,
  PropertyStatusBuckets,
  DatasetKind,
  CityZoningRecord,
  CityZoningIndexEntry,
  CityZoningIndex,
  CasesSource,
  CaseFieldMap,
  CurrentZoningSource,
  CurrentZoningFieldMap,
  GeocoderConfig,
  GeocoderProvider,
  ZoningByAddressSource,
  ZoningSourceType,
  ZoningStatusBuckets,
  ZoningToolKind,
  CitySource,
} from "./city-types.js";
export { cityPropertyIndex, cityZoningIndex } from "./cities-data.js";
