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
// → https://urbankitstudio.com/tools/parcel-lookup?endpoint=https%3A%2F%2F...

// Pass the county record as well and its primary layer (endpoints[0]), when
// that layer refuses typed search or several counties share it, links to the
// county's own page, which scopes it. Any other endpoint keeps the generic link:
const alachua = findCounty("florida", "alachua-county")!;
buildParcelLookupDeepLink(alachua.endpoints[0], undefined, alachua);
// → https://urbankitstudio.com/tools/parcel-lookup/florida/alachua-county

For single-address owner lookups in the browser, the free [Owner Lookup](https://urbankitstudio.com/tools/owner-lookup) tool reads the same county layers this package indexes.
```

## API

| Function | Returns |
|---|---|
| `listStates()` | `StateIndexEntry[]` — all 50 states and DC + `populated` flag |
| `findState(stateSlug)` | `StateFile \| undefined` |
| `findCounty(stateSlug, countySlug)` | `CountyRecord \| undefined` |
| `findCountyByFips(fips)` | `CountyRecord \| undefined` — match by 5-digit county FIPS |
| `listCountiesByState(stateSlug)` | `CountyRecord[]` |
| `buildParcelLookupDeepLink(endpoint, base?, county?)` | URL string into the UrbanKit lookup tool; with `county`, the county route when the endpoint is that county's flagged or shared primary layer |
| `canonicalLayerUrl(url)` | one key per layer: host + path, scheme, default port, query, fragment, a trailing `/query` and case folded away |
| `offersAttributeSearch(endpoint)` | `false` when the layer refuses a `where` clause (`attributeSearch: "unsupported"`); query it by geometry instead |
| `countyOffersAttributeSearch(county)` | `true` when any of the county's layers takes a `where` clause |
| `offersPagination(endpoint)` | `false` when the layer refuses `resultRecordCount` and `resultOffset` (`supportsPagination: false`); send one request without them, see below |
| `slugify(s)`, `countySlugFromName(s)` | string helpers matching the atlas slug convention |
| `statePath(slug)`, `countyPath(state, county)` | URL paths under `/parcel-atlas` |
| `listCities(filter?)` | `CitySummary[]` — every covered city, narrowed by `state`, `kind` (`violations`, `permits`, `zoning`) or `countySlug` |
| `findCity(ref, state?)` | `CitySummary[]` — by slug, name, `"Name, ST"` or alias; 0, 1 or many (an ambiguous name is a list) |
| `getCityProperty(slug)`, `getCityZoning(slug)` | `CityPropertyRecord \| undefined`, `CityZoningRecord \| undefined` — the registry records; county records' `relatedPropertyCitySlug` / `relatedZoningCitySlug` resolve here |
| `cityDatasets(slug, kind?)` | `CityDatasetDescriptor[]` — provider, endpoint, lookup mode, columns, scope `where`, field map, status buckets, freshness, query template, sample query and a query note |
| `buildCityQuery(dataset, street)` | the URL urbankitstudio.com sends for that dataset and street (on a table that splits the address into columns, the street name is derived first; see below); `null` when the lookup needs a point or a parcel id first |
| `citiesForCounty(stateSlug, countySlug)` | `CitySummary[]` — the covered cities inside one atlas county |
| `cityPath(slug, kind)` | URL path of the city's page under `/tools/property-report` or `/tools/zoning-cases` |

The full typed root is also exported as `atlas`:

```ts
import { atlas } from "@urbankitstudio/atlas";

atlas.version;          // string
atlas.lastUpdated;      // ISO date
atlas.totals;           // { states, counties, endpoints }
atlas.byStateSlug;      // Map<stateSlug, StateFile>
```

## City datasets: code violations, building permits, zoning cases

The package also bundles the two city registries behind
[urbankitstudio.com/tools/property-report](https://urbankitstudio.com/tools/property-report) and
[urbankitstudio.com/tools/zoning-cases](https://urbankitstudio.com/tools/zoning-cases): for each
covered city, the public open-data endpoint (Socrata, ArcGIS, CKAN or CARTO) that serves its code
violations, building permits or zoning cases, the column an address search runs against, the date
column, any filter that is part of the dataset's definition, and the field map the site renders
from. `buildCityQuery` returns the exact URL the site sends, so what you fetch is what a visitor
to the page fetches.

```ts
import { findCity, cityDatasets, buildCityQuery } from "@urbankitstudio/atlas";

const [dallas] = findCity("Dallas, TX");          // [] when not covered, many when ambiguous
for (const ds of cityDatasets(dallas.slug, "permits")) {
  const url = buildCityQuery(ds, "Commerce");      // the street line only; a name alone matches the most
  if (url) {
    const rows = await (await fetch(url)).json();  // you run the query; this package never fetches
    console.log(ds.provider, ds.freshness.lastVerified, rows.length);
  } else {
    console.log(ds.queryTemplate);                 // a point or parcel lookup: {LON},{LAT} placeholder
  }
}
```

Three lookup modes appear in `dataset.lookup`. `address` is a case-insensitive substring match
on `dataset.addressField` (the common case); the street is escaped for the provider's SQL by
`buildCityQuery`, which is why an address lookup carries no paste-in template, and the LIKE
wildcards `%` and `_` stay active as they do on the site. When `dataset.addressParts` lists more
columns than `addressField` (Dallas violations store `str_num`, `str_prefix`, `str_nam`,
`str_suffix`), the name column holds the street name alone, so `buildCityQuery` matches the
derived name: the typed house number comes off, then a leading directional when the table has a
direction column, then one trailing street type when it has a type column; `streetForDataset`
returns that name, and every row on the street comes back for you to filter by house number. `location` means the docket is published on parcel
shapes with no address column (Denver, Charlotte): geocode the address yourself and put the
WGS84 point into `queryTemplate` where `{LON},{LAT}` stands. `parcel` (New York) is keyed by
parcel id; `queryNote` spells out the two joins. `scopeWhere`, when present, is part of the
dataset's definition and belongs in every query. `freshness.lastVerified` is the date the
registry entry was last checked by hand and `latestRecordDate`, when present, the newest record
seen then. Socrata throttles anonymous callers, so send your own `X-App-Token` header for volume.

Owner names: the property field maps name no owner or taxpayer column, and the zoning field maps
carry column names only (never values). Owner lookups are the atlas's county layers, not these
datasets.

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

## Some layers refuse pagination

An endpoint may carry `supportsPagination: false` and a `maxRecordCount`. That
layer answers any `resultRecordCount` or `resultOffset`, in any letter case,
with HTTP 200 and an error body instead of rows:

```json
{"error":{"code":400,"message":"Pagination is not supported."}}
```

Check `offersPagination(endpoint)` before adding either parameter. When it is
`false`, send one request without them. The layer returns at most
`maxRecordCount` rows and sets `exceededTransferLimit` when more matched, so
narrow the `where` clause or the geometry instead of paging. The endpoint's
`sampleQuery` already has that shape. `maxRecordCount` is what the layer
declared when it was registered; the response's `exceededTransferLimit` is the
authority on whether a result was cut.

```ts
import { findCountyByFips, offersPagination } from "@urbankitstudio/atlas";

const endpoint = findCountyByFips("17089")!.endpoints[0];
const params = new URLSearchParams({ where: "1=1", outFields: "*", f: "json" });
if (offersPagination(endpoint)) params.set("resultRecordCount", "100");
```

An absent `supportsPagination` means the layer pages; `true` is never written.

## `addedAt` is the one date that never moves

A county may carry `addedAt` (YYYY-MM-DD): the date it entered the atlas. It is
optional, because counties added before 2026-10-05 carry none, and it is the
only date here that is not re-stamped: `lastVerified` moves on every
re-verification, so a county verified yesterday can look brand new. When you
need to know whether a county is new to the atlas rather than recently checked,
read `addedAt` and fall back to the oldest `lastVerified` only when it is absent.

## Coverage today

The atlas bundles **314 counties across all 50 US states and DC** (331 verified endpoints), covering the largest counties in each. Call `listStates()` to enumerate the full set.

Every state has at least one county on record, and 305 of the 314 carry a verified endpoint. The other 9 have `hasPublicRest: false` and an empty `endpoints` array, with `notes` recording the reason and who to contact. Those reasons vary: a subscription-only regional GIS partner, a statewide server that requires an auth token, a state with no county-level parcel authority, a county viewer with no public query API, a county that does not publish owner names online. They ship rather than being omitted, so `findCounty()` still resolves them. **Check `hasPublicRest`** rather than assuming every county has an endpoint; `totals.countiesWithEndpoint` gives the queryable count directly.

The city registries cover 30 cities with code-violation or building-permit datasets, 19 with zoning-case datasets. Call `listCities()` for the current set.

Counties and cities are added as their public endpoints are verified. Package versions bump when data refreshes — pin to a minor range (`^0.x`) to receive new counties and cities without breaking changes.

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
