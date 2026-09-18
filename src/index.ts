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
export { reviewedCapability, isReviewedUnservable } from "./capability.js";

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
  statePath,
  countyPath,
} from "./helpers.js";

export { atlas, atlasIndex } from "./data.js";
export type { Atlas } from "./data.js";
