# @urbankitstudio/atlas

[![Socket Badge](https://badge.socket.dev/npm/package/@urbankitstudio/atlas)](https://socket.dev/npm/package/@urbankitstudio/atlas)

JS SDK for the **UrbanKit County Parcel REST API Atlas** — a curated index of public ArcGIS REST endpoints for US county parcel data, with searchable field metadata, sample queries, and license info.

Use it to:

- Look up the parcel REST endpoint for a given US county (e.g. Kane County, IL).
- Discover which fields are searchable on each endpoint (PIN, owner name, address).
- Build deep-links into the UrbanKit parcel lookup tool.

The data is the same set powering [urbankitstudio.com/parcel-atlas](https://urbankitstudio.com/parcel-atlas), bundled offline so your code does not need to make a runtime network request.

## Install

```bash
npm i @urbankitstudio/atlas
```

Works in Node.js (>=18) and modern bundlers (Vite, webpack, esbuild, Rollup, Next.js, Remix). Ships ESM + CJS with full TypeScript types. No runtime dependencies. `sideEffects: false`.

## Quick start

### 1. List populated states

```ts
import { listStates } from "@urbankitstudio/atlas";

const populated = listStates().filter((s) => s.populated);
// [{ slug: "arizona", name: "Arizona", abbrev: "AZ", countyCount: 1, ... }, ...]
```

### 2. Look up a county by slug

```ts
import { findCounty } from "@urbankitstudio/atlas";

const kane = findCounty("illinois", "kane-county");
if (kane) {
  console.log(kane.endpoints[0].url);
  // → https://gis.kanecountyil.gov/...

  const pin = kane.endpoints[0].searchFields.find((f) => f.name === "PIN");
  console.log(pin?.label);
  // → "Parcel Identification Number (PIN)"
}
```

### 3. Look up a county by FIPS code

```ts
import { findCountyByFips } from "@urbankitstudio/atlas";

const kane = findCountyByFips("17089"); // 5-digit county FIPS (state + county)
if (kane) {
  console.log(kane.county, kane.stateSlug);
  // → Kane illinois
}
// Unknown, malformed, or non-5-digit input returns undefined (never throws).
```

### 4. Build a parcel-lookup deep-link

```ts
import { findCounty, buildParcelLookupDeepLink } from "@urbankitstudio/atlas";

const kane = findCounty("illinois", "kane-county")!;
const link = buildParcelLookupDeepLink(kane.endpoints[0]);
// → https://urbankitstudio.com/tools/parcel-lookup?endpoint=https%3A%2F%2F...&fieldHint=TaxName

For single-address owner lookups in the browser, the free [Owner Lookup](https://urbankitstudio.com/tools/owner-lookup) tool reads the same county layers this package indexes.
```

## API

| Function | Returns |
|---|---|
| `listStates()` | `StateIndexEntry[]` — all 50 states + `populated` flag |
| `findState(stateSlug)` | `StateFile \| undefined` |
| `findCounty(stateSlug, countySlug)` | `CountyRecord \| undefined` |
| `findCountyByFips(fips)` | `CountyRecord \| undefined` — match by 5-digit county FIPS |
| `listCountiesByState(stateSlug)` | `CountyRecord[]` |
| `buildParcelLookupDeepLink(endpoint)` | URL string into the UrbanKit lookup tool |
| `slugify(s)`, `countySlugFromName(s)` | string helpers matching the atlas slug convention |
| `statePath(slug)`, `countyPath(state, county)` | URL paths under `/parcel-atlas` |

The full typed root is also exported as `atlas`:

```ts
import { atlas } from "@urbankitstudio/atlas";

atlas.version;          // string
atlas.lastUpdated;      // ISO date
atlas.totals;           // { states, counties, endpoints }
atlas.byStateSlug;      // Map<stateSlug, StateFile>
```

## `status` is a publish-time claim, not a live signal

This package ships static JSON and makes no network calls, so `status` and
`lastVerified` on every endpoint describe what was true **when the version you
installed was published**. `status: "live"` means a check passed before publish —
not that the endpoint is up right now. A county can go down the day after a
release and every installed copy keeps saying `"live"` until the next one.

The distinction is not hypothetical: on 2026-08-04 a county was being served as
`"live"` from its registry entry while the liveness probe had it down that same
afternoon.

For the current answer, ask the health endpoint — no API key, refreshed every
two hours:

```ts
import { LIVE_STATUS_URL } from "@urbankitstudio/atlas";

const res = await fetch(`${LIVE_STATUS_URL}?fips=17089`);
const health = await res.json();
// { ok: true, found: true, county_fips: "17089",
//   status: "ok" | "degraded" | "down" | "unknown",
//   consecutive_failures, last_ok_at, checked_at }
```

Two cases to handle rather than ignore:

- **`found: false`** means no observation exists — the county may be untracked or
  never probed. It is *not* a statement that the endpoint is healthy.
- **A `503`** means the health store itself was unreachable. Also not a health
  claim.

Treat both as *unknown*. Neither should render as "up".

Omit `?fips=` to get every tracked county in one call.

## Coverage today

The atlas bundles **233 counties across all 50 US states** (245 verified endpoints), covering the largest counties in each. Call `listStates()` to enumerate the full set.

Every state has at least one county on record, and 227 of the 233 carry a verified endpoint. The other 6 have `hasPublicRest: false` and an empty `endpoints` array, with `notes` recording the reason and who to contact. Those reasons vary: a subscription-only regional GIS partner, a statewide server that requires an auth token, a state with no county-level parcel authority, a county viewer with no public query API, a county that does not publish owner names online. They ship rather than being omitted, so `findCounty()` still resolves them. **Check `hasPublicRest`** rather than assuming every county has an endpoint; `totals.countiesWithEndpoint` gives the queryable count directly.

Counties are added as their public REST endpoints are verified. Package versions bump when data refreshes — pin to a minor range (`^0.x`) to receive new counties without breaking changes.

The live, browseable atlas lives at [urbankitstudio.com/parcel-atlas](https://urbankitstudio.com/parcel-atlas).

## Socket flags `urlStrings` — that's the atlas, not a leak

[Socket](https://socket.dev/npm/package/@urbankitstudio/atlas)'s supply-chain scanner flags this package for `urlStrings`: code and data containing many literal URLs. That flag is doing its job correctly, and the answer is not to hide the URLs — **they are the product.** Every one is a public, government-run ArcGIS REST endpoint for county parcel data, plus the two `urbankitstudio.com` URLs this SDK references for live status (`LIVE_STATUS_URL`, above) and parcel-lookup deep links. The package does not call any of them itself; it hands them to you as data (`sideEffects: false`, zero runtime dependencies).

Socket also flags `unpopularPackage` — a download-count signal, not a code issue, that install growth resolves on its own.

## License

MIT — see [LICENSE](./LICENSE). © 2026 UrbanKit Studio.

This package's atlas dataset (the open **discovery layer** — county → REST endpoint
mappings and field metadata) is provided under MIT. Live, always-fresh and enriched
data — geocoding, address→parcel resolution, bulk enrichment, and the data-availability
SLA — are the paid [UrbanKit Studio API](https://urbankitstudio.com/pricing).
