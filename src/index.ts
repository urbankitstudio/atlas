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
