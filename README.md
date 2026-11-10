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

`findState`, `findCounty` and `listCountiesByState` look a state up by its slug, and a two-letter abbreviation is also accepted, so `findCounty("IL", "kane-county")` finds Kane too. The 50 states and DC read as their slug, by the same rule as the hosted MCP server and the REST API, and any other input is read as a slug unchanged, so `"pr"` finds nothing.

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
| `pausedAnswer(entry, record, page?)` | `CountyPausedAnswer` — the `coverage` block (`status: "paused"`) the hosted API returns for a county paused by its terms or a law; which counties are paused is live data at `GET https://urbankitstudio.com/api/atlas/status` (`paused`) |
| `accessBlocks(entry, flag)`, `flagsFor(preset)`, `pausedFlags(flags)`, `presetOf(flags)` | the seven surface flags (`ACCESS_FLAGS`: `paid_lookup`, `paid_enrich`, `paid_bulk`, `paid_lists`, `free_site_lookup`, `free_site_lists`, `free_discovery`) and the presets `paid-off`, `paid-lists-off`, `all-off` (`PRESET_FLAGS`); `accessBlocks` says whether one surface is paused for a county |

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
wildcards `%` and `_` stay active as they do on the site. A dataset that sets `houseNumberSpaceRuns`
(only Orlando's, whose tables store two or three spaces after the house number: `4274  TATUM ST`)
also matches the space after a leading house number as a run of one to four spaces, or the spacing
as typed, and nothing else, so `4274 Tatum St` finds them but not `4274 OLD TATUM ST`; every other
dataset matches the spacing as typed. When `dataset.addressParts` lists more
columns than `addressField` (Dallas violations store `str_num`, `str_prefix`, `str_nam`,
`str_suffix`), the name column holds the street name alone, so `buildCityQuery` matches the
derived name: the typed house number comes off, then a leading directional when the table has a
direction column, then one trailing street type when it has a type column (a strip that would leave
a lone letter, no letter or digit, or only a direction or type word a leading directional exposed,
as `N St` would become `St`, is not applied past the house number: `100 N St` sends `N St`, `100 %` and `100 E` are sent as typed,
while `100 Court St` sends `Court`, and `2600 South Blvd` sends `South` where the table has a type column); `streetForDataset`
returns that name, and every row on the street comes back for you to filter by house number. A dataset
that keeps the house number in its own column (`streetNumberField`: Los Angeles violations, Fort Worth
permits, Scottsdale violations) matches the number on that column and the name on `addressField`; a street
typed without a number gets the same trimming, so `Funtier Ct` is matched as `Funtier` and `South St` as `South`. `location` means the docket is published on parcel
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

## Some services are not one county's

An endpoint may carry `sharedService: true`: one county registers a layer of the
service, but the service covers other counties or the whole state (Vermont's
VCGI service under Chittenden, Hawaii's `ParcelsZoning` under Kauai, Denver's and
Anchorage's statewide composites). A consumer that treats an unregistered layer of
a service as the registering county's must not for a marked one: its other layers
may be any county's. UrbanKit's own free tools still ask the county access switch
about the registering county before reading such a layer, so a pause on that county
holds the service's other layers too. Absent is the other value; `false` is never
written.

## Some layers flag an owner's record confidential

An endpoint may carry `confidentialFlag: { field, values, safeValues }` (type
`ConfidentialFlag`). Texas Tax Code §25.025 lets peace officers, judges,
family-violence victims and others have their home address kept confidential in
appraisal records, and Harris (`confidential_flag`, `"Y"`) and Collin
(`GIS_DBO_AD_Entity_confidential_`, `"T"`) publish those accounts with the owner
and a flag column beside it. A row whose flag is set must not be shown or passed
on. Request the column whenever you request the owner, and keep a row only if its
raw cell equals one of `safeValues` AND the cell, trimmed and upper-cased, contains
no listed value (Harris packs one flag per ownership slot into a ten-character
string: `"YNNNNNNNNN"` is slot 1 confidential). A NULL cell, or a row that lacks
the column, is flagged. The hosted API and MCP withhold a flagged row with
`withheld: "county-redacted"`. Ector (`conf_flg`, `"1"`) carries a forward guess:
the column was 0 on every row when measured, so the marker names a value the
county has not yet published (the record's `notes` say so).

Brown WI (`wi-brown`, since 0.8.0) carries one too: `Confidential`, `"1"`, with
`safeValues: [0]` (a small-integer column). It is not a Texas flag. On its 320
flagged rows the county publishes "NOT AVAILABLE" in the owner and mailing cells,
and the flag keeps those rows withheld if the county stops doing that. Measured
live 2026-11-10: 105,909 rows hold 0, 320 hold 1, none is NULL, and the cast
clause and the IN clause below, alone or ANDed, keep the 105,909.

`safeValues` lists the exact raw cells each layer holds for an unflagged owner,
measured 2026-10-26 with `returnDistinctValues` (complete lists): Harris
`["          ", "N         ", "NNN       ", "NNNNNNNNNN"]`, every entry ten
characters with its padding (ten spaces; `N` and nine spaces; `NNN` and seven
spaces; ten `N`s); Collin `["F"]`; Ector `[0]`, a number, because `conf_flg` is
an integer column. It is there because a contains test written in SQL cannot
match the rule above on every county backend (non-ASCII upper-casing, an embedded
NUL that stops `LIKE`, the 255-character cast, mixed encodings): a cell that is
not exactly a listed safe value drops out, whatever the backend does with text.

In a `where` clause, cast the column to text first: a one-character value needs
`CAST(<field> AS VARCHAR(255)) NOT LIKE '%<value>%'` (an equality test keeps
Harris's `"YNNNNNNNNN"` rows), and that includes Collin's `"T"`; a longer value
needs `CAST(<field> AS VARCHAR(255)) <> '<value>'`. The cast is required:
Ector's `conf_flg` is an integer, and `conf_flg NOT LIKE '%1%'` answers there
with an ArcGIS error (code 400, inside an HTTP 200 response, so a client that
checks only the HTTP status misses it), while the cast form runs on Harris,
Collin and Ector alike. Do not wrap the column in `TRIM()`: `TRIM(<field>)`
answers with the same ArcGIS error on all three layers. The SQL route compares
the untrimmed text, which `NOT LIKE '%<value>%'` does not mind; only a row
filter in your own code trims. `UPPER(CAST(<field> AS VARCHAR(255)))` also runs
on all three if you want the comparison case-blind. Measured 2026-10-25: Harris
has 470,972 blank cells that hold spaces, and the clause keeps them; it also has
5,235 NULL cells, and Collin has 15,003. A NULL cell fails the clause and the
row drops out; a missing column makes the query fail. Since 0.6.47 the hosted API,
the hosted MCP and the site's free tools keep the same rows, plus unpadded or
whitespace-wrapped forms of a safe cell, none of which can carry a marker: they
ignore trailing spaces (U+0020) on both sides of a string safe value, match an
integer safe value against text that trims (JavaScript `trim`) to its decimal
form, withhold a cell that holds a listed value anywhere in it, whatever that
value's length, and withhold every row of a layer whose flag lists no safe
values. So they withhold those NULL rows too.

Then AND `<field> IN (<safeValues>)`, with the column neither cast nor
upper-cased: strings single-quoted with `'` doubled, integers bare, joined by
`, ` in the listed order. Harris:
`confidential_flag IN ('          ', 'N         ', 'NNN       ', 'NNNNNNNNNN')`;
Collin: `GIS_DBO_AD_Entity_confidential_ IN ('F')`; Ector: `conf_flg IN (0)`.
Measured live 2026-10-26, the IN clause alone keeps exactly the rows the cast
clause keeps (Harris 1,541,671; Collin 435,783; Ector 77,042), and so do the two
ANDed together. Each flagged record's `sampleQuery` requests the column and
carries both clauses.

```ts
import { findCountyByFips } from "@urbankitstudio/atlas";

const endpoint = findCountyByFips("48201")!.endpoints[0];
const flag = endpoint.confidentialFlag; // { field: "confidential_flag", values: ["Y"], safeValues: [...] }
const cell = flag ? `CAST(${flag.field} AS VARCHAR(255))` : null;
const literal = (v: string | number) => (typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);
// A flag without safeValues cannot keep flagged rows out, so its query returns no rows.
const notFlagged = flag
  ? flag.safeValues?.length
    ? [
        ...flag.values.map((v) => (v.length === 1 ? `${cell} NOT LIKE '%${v}%'` : `${cell} <> '${v}'`)),
        `${flag.field} IN (${flag.safeValues.map(literal).join(", ")})`,
      ].join(" AND ")
    : "1=0"
  : null;
const where = notFlagged ? `(${where0}) AND ${notFlagged}` : where0;
```

From 0.6.46 every flagged record carries a non-empty `safeValues`; the registry's
validator refuses a marker without one, or with a safe value that is itself
flagged.

An absent `confidentialFlag` means the layer publishes no such column, not that no
owner there is protected.

## `addedAt` is the one date that never moves

A county may carry `addedAt` (YYYY-MM-DD): the date it entered the atlas. It is
optional, because counties added before 2026-10-05 carry none, and it is the
only date here that is not re-stamped: `lastVerified` moves on every
re-verification, so a county verified yesterday can look brand new. When you
need to know whether a county is new to the atlas rather than recently checked,
read `addedAt` and fall back to the oldest `lastVerified` only when it is absent.

## Coverage today

The atlas bundles **538 counties across all 50 US states and DC** (521 verified endpoints), covering the largest counties in each state, every county in Mississippi and all 100 of North Carolina's. Call `listStates()` to enumerate the full set.

Every state has at least one county on record, and 493 of the 538 carry a verified endpoint. The other 45 have `hasPublicRest: false` and an empty `endpoints` array, with a `coverage` block that gives the reason code and one sentence to show as is, `notes` with the detail, and a `contact` for the county office (its `department`, `url` and, where the county publishes one, `email`). The reasons vary. A county sells its owner data, runs no public query service, puts one behind a login or under terms that bar us from serving it, publishes a layer without owner names or with them blank, or runs a service that is down, stale or technically unusable. They ship rather than being omitted, so `findCounty()` still resolves them, and `coverageAnswer()` turns any of them into the answer the hosted MCP server and the REST API give. **Check `hasPublicRest`** rather than assuming every county has an endpoint; `totals.countiesWithEndpoint` gives the queryable count directly.

The city registries cover 30 cities with code-violation or building-permit datasets, 19 with zoning-case datasets. Call `listCities()` for the current set.

Counties and cities are added as their public endpoints are verified. Package versions bump when data refreshes — pin to a minor range (`^0.x`) to receive new counties and cities without breaking changes.

The live, browseable atlas lives at [urbankitstudio.com/parcel-atlas](https://urbankitstudio.com/parcel-atlas).

## Socket flags `urlStrings` — that's the atlas, not a leak

[Socket](https://socket.dev/npm/package/@urbankitstudio/atlas)'s supply-chain scanner flags this package for `urlStrings`: code and data containing many literal URLs. That flag is doing its job correctly, and the answer is not to hide the URLs — **they are the product.** Every one is a public, government-run ArcGIS REST endpoint for county parcel data, plus the two `urbankitstudio.com` URLs this SDK references for live status (`LIVE_STATUS_URL`, above) and parcel-lookup deep links. The package does not call any of them itself; it hands them to you as data (`sideEffects: false`, zero runtime dependencies).

Socket also flags `unpopularPackage` — a download-count signal, not a code issue, that install growth resolves on its own.

## Attribution

The parcel layers the atlas points to belong to their publishers. These publishers require or request credit when their data is reused, and each record listed here ends its `notes` with the same `Credit:` line. Where the publisher names the exact statement to show, the record also carries it verbatim and in full in `credit` (0.6.42: the ten Colorado counties, San Francisco, Greene MO, whose statement is the City of Springfield's required disclaimer, and Berks PA, whose statement the County's data agreement requires on every derived product), so a page prints it beside the county's results and on the county's page as is. A required statement is never shortened; the validator allows `credit` up to 900 characters for that reason (600 until 0.7.2, when Nevada CA's attribution plus the county's disclaimer, 782 characters, needed more).

| Records | Publisher's terms | Credit |
|---|---|---|
| `co-el-paso`, `co-jefferson`, `co-arapahoe`, `co-adams`, `co-douglas`, `co-larimer`, `co-boulder`, `co-weld`, `co-mesa`, `co-park` (the State of Colorado's `Colorado_Public_Parcels` service) | The service's copyright text names this statement as sufficient | State of Colorado Public parcels were accessed on 2026-10-17 from https://gis.colorado.gov/public/rest/services/Address_and_Parcel |
| `ca-san-francisco` | [PDDL](http://opendatacommons.org/licenses/pddl/1.0/) on the ArcGIS item and the DataSF source dataset; attribution not required, given as the other CA records do | City and County of San Francisco (DataSF, SFGIS) |
| `mo-greene` | The City of Springfield's [disclaimer](https://www.springfieldmo.gov/disclaimer), "Use of Data": anyone using data from the City's open data systems must include this disclaimer wherever the data is distributed | This site provides data that has been modified for use from its original source, www.springfieldmo.gov, the official website of the City of Springfield, Missouri. The City of Springfield makes no claims as to the content, accuracy, timeliness, or completeness of any of the data provided at this site. The data provided at this site is subject to change at any time. It is understood that the data provided at this site is being used at one's own risk. |
| `pa-berks` | The County of Berks' data agreement, clause 4: this sentence on every product derived from the County's data | Information is based on geospatial data from the County of Berks. |
| `ca-san-mateo` (0.6.48) | The County's [GIS terms of use](https://www.smcgov.org/planning/gis-terms-use): the data is as-is, and the statement that SMC Data and San Mateo County cannot vouch for analyses derived from it | County of San Mateo GIS. The data is provided as-is, and San Mateo County makes no representations or warranties of any kind with respect to it. SMC Data and San Mateo County cannot vouch for the data or analyses derived from these data. |
| `wa-pierce` (0.6.48) | The County's [GIS Data Terms of Use](https://matterhorn.piercecountywa.gov/Disclaimer/PierceCountyGISDataTermsofUse.pdf): pass its disclaimers to end users, no county logo, not a county product | Pierce County GIS data (Pierce County Assessor-Treasurer). Pierce County does not warrant the Data in any way and makes each of the disclaimers set out in its GIS Data Terms of Use (https://matterhorn.piercecountywa.gov/Disclaimer/PierceCountyGISDataTermsofUse.pdf). This is not a Pierce County product. |
| `ca-nevada` (0.7.0, disclaimer 0.7.2) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) on the county's Parcel Information item, credited to Nevada County GIS; the county's Digital Data Download Agreement says parcel boundaries do not represent legal boundaries; the county's GIS Division asked us to show its disclaimer (2026-11-02) | Nevada County GIS. Licensed under Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/). Parcel boundaries do not represent legal boundaries. Every reasonable effort has been made to assure the accuracy of the maps and data provided; nevertheless, some information may not be accurate. The County of Nevada assumes no responsibility arising from use of this information. THE MAPS AND ASSOCIATED DATA ARE PROVIDED WITHOUT WARRANTY OF ANY KIND, either expressed or implied, including but not limited to, the implied warranties of merchantability and fitness for a particular purpose. Before making decisions using the information provided on this map, contact the Nevada County Public Counter staff to confirm the validity of the data provided. |
| `sc-york` (0.7.0, 30-2-50 notice 0.8.0) | The Parcels item's licence is the county's no-warranty, not-a-legal-survey disclaimer; the county's [GIS Data Download](https://www.yorkcountysc.gov/239/GIS-Data-Download) page offers the data at no cost; the S.C. Code 30-2-50 notice follows it | York County, SC GIS (Open Data). York County Government South Carolina and its mapping contractors do not warrant the accuracy of the displayed information and specifically disclaim any warranty for merchantability or fitness for a particular purpose. This map is not a legal survey. S.C. Code 30-2-50 makes it a misdemeanor to knowingly obtain or use personal information obtained from a state agency, a local government, or other political subdivision for commercial solicitation directed to any person in South Carolina. |
| `md-baltimore-city` (2026-11-10) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0), named by the city's data.gov record for Real Property Information | Baltimore City, Open Baltimore: Real Property Information, licensed under Creative Commons Attribution 3.0 (https://creativecommons.org/licenses/by/3.0). |
| `ca-tuolumne` (2026-11-10) | [ODbL 1.0](http://opendatacommons.org/licenses/odbl/1.0/) on the county's Parcels_WithSiteAddress item, credited to Tuolumne County GIS | Tuolumne County GIS. Contains information from Parcels_WithSiteAddress (TUOLUMNE.CDD.Parcels_Secured_Asmts_Formatted), which is made available under the Open Database License (ODbL) 1.0, http://opendatacommons.org/licenses/odbl/1.0/. |
| `ok-creek` (0.8.0) | INCOG's Parcels_CreekCo [item](https://map11.incog.org/arcgis11wa/rest/services/Parcels_CreekCo/MapServer/0/iteminfo) credits the Creek County Assessor and carries INCOG's use-of-this-information disclaimer | Creek County Assessor; published by INCOG. USE OF THIS INFORMATION: This dataset has been created for illustrative purposes only. Although every effort has been made to produce the most current, correct and clearly expressed data possible, all geographic information has limitations due to scale, resolution, date and interpretation of the original source materials. This dataset is based on data collected from various sources that can change over time and without notice. Therefore, the dataset provided is not intended to replace any official source. You should not act or refrain from acting based upon this feature class without independently verifying the information and, if necessary, obtaining professional advice. The burden of determining the accuracy, completeness, timeliness of information rest solely on the user. Copyright © 2016 INCOG |
| `mo-jasper` (0.8.0) | The City of Joplin's JascoParcels52626 [item](https://www.arcgis.com/home/item.html?id=5d47528e4f1c42dc806a55e28b7e1c19) licence text: informational and general mapping use, no warranty, verify with Jasper County | Jasper County, Missouri parcel data, published by the City of Joplin GIS. This dataset is provided for informational and general mapping purposes only. It is not intended for use as a legal survey, title record, deed description, or authoritative determination of property boundaries or ownership. The City of Joplin makes no warranty regarding the accuracy, completeness, currency, or fitness of the data for a particular purpose. Users assume responsibility for independently verifying information with Jasper County or another appropriate authoritative source. The City of Joplin and Jasper County are not responsible for decisions, damages, or losses resulting from use of this dataset. |
| `mi-muskegon` (0.8.0) | The county's [GIS Data Download / Use Agreement](https://gis.muskegoncountygis.com/open_data/documents/MCGIS_Data_Download_Use_Agreement_v2026.pdf) (v2026), clause 8: this notice on every derivative work. Clause 5 also requires its disclaimer in the use agreement of any application of the Data, and the license is revocable (clause 9: the county may charge in future); see the record's `notes` | Reproduced with permission granted Muskegon County, Michigan. Some information has been provided subject to a non-exclusive, limited, and revocable license granted by Muskegon County, Michigan. |
| `md-montgomery` | Reuse allowed, attribution requested | Montgomery County Planning Department (M-NCPPC) |
| `md-prince-georges` | Reuse allowed, attribution requested | Prince George's County Planning Department (M-NCPPC) |
| `nc-wake` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Wake County (Wake County GIS, Wake County Revenue) |
| `ca-sonoma` | [CC BY-SA 3.0 US](https://creativecommons.org/licenses/by-sa/3.0/us/legalcode) | County of Sonoma |
| `ca-sacramento` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) in the county's catalog (the item itself says public domain) | Sacramento County GIS |
| `dc-district-of-columbia` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | District of Columbia |

## License

MIT — see [LICENSE](./LICENSE). © 2026 UrbanKit Studio LLC.

This package's atlas dataset (the open **discovery layer** — county → REST endpoint
mappings and field metadata) is provided under MIT. Live, always-fresh and enriched
data — geocoding, address→parcel resolution, bulk enrichment, and the data-availability
SLA — are the paid [UrbanKit Studio API](https://urbankitstudio.com/pricing).
