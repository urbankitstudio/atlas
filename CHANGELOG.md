# @urbankitstudio/atlas Changelog

## 0.6.11 — 2026-10-03

Repairs three registrations the liveness probe flagged (Monmouth NJ, Prince
George's MD, Pinal AZ), records why Greenville SC stays unreachable, fixes the
three Arkansas scopes that returned nothing without an error, reorders
Washoe NV's owner fields, and declares two endpoint fields the bundled data
already carried. `totals` are unchanged: 239 counties / 251 endpoints.

### Fixed: Arkansas county scopes
- The statewide Planning_Cadastre layer now stores `countyfips` as the 3-digit
  county code. `scopeWhere` and `sampleQuery` for Pulaski, Benton and
  Washington move from '05119'/'05007'/'05143' to '119'/'007'/'143'. The old
  values matched 0 rows, so every scoped attribute search for these counties
  returned nothing. The new scopes count 180,229, 175,795 and 114,791 rows
  (2026-10-03).

### Fixed: endpoints
- Monmouth County NJ moves to the county's new ArcGIS Online layer
  (Monmouth_County_Parcels FeatureServer/0 on services1.arcgis.com). The old
  services9 GEO_MC_Parcels service is gone. Field names change: PAMSPIN,
  Owner_Name, Location, Class, Net_Value, Land_Value, Impr_Value, Sale_Date,
  Sale_Price, Year_Built, Zone. Owner mailing is now Owner_Street plus
  Owner_Csz, replacing CityStateZip, so the `mailing` role a consumer derives
  moves from a city/state/zip column to a street column. Acreage is dropped.
  Value and date fields are strings on this layer.
- Prince George's County MD moves to the Planning Department's hosted copy
  (Property_Flattened_Py FeatureServer/0 on services1.arcgis.com), with the
  same field names. The county host answers "Layer not found" on about every
  second request. The hosted copy refreshes periodically, not live.
- Pinal County AZ: the county renamed every field to long-form names (for
  example PARCELID to Parcel_Identification_Number, OWNERNME1 to
  First_Owner_Name). All searchFields and the sampleQuery are re-mapped. The
  layer now publishes owner mailing address (Postal_Address, Postal_City,
  Postal_State, Postal_Zip_Code_5/4), so `owner_mailing_address` for Pinal
  moves from not_published to available.
- Greenville County SC: notes only. It stays `unreachable` because the county
  deleted its GreenvilleJS services folder.
- Washoe County NV: LASTNAME now precedes FIRSTNAME in `searchFields`, so a
  consumer that takes the first owner column searches surnames, as the
  record's own sampleQuery does. A derived owner value for a Washoe row is
  therefore the surname alone (was the first-name column).

### Added: two optional fields on `EndpointRecord`
- `scopeWhere?: string`: the predicate ANDed into every attribute search on a
  layer shared by several counties. The bundled data already carried it, and
  the type now declares it.
- `attributeSearch?: "unsupported"`: marks a layer that cannot serve a
  `where`-clause search. Set today on the 67 Florida FDOR registrations.

## 0.6.10 — 2026-10-03

Data refresh. No API change. `totals` move from **235 counties / 247
endpoints** to **239 counties / 251 endpoints**; 233 of the 239 now carry a
verified endpoint (was 229 of 235).

### Data refresh — four counties added

- **Georgia:** Dougherty County (FIPS 13095, Albany), with a verified
  endpoint on Albany GIS's `Parcels_Public_View` FeatureServer, covering the
  city and county jurisdictions (38,007 parcels). Searchable by owner name
  (`Name`), parcel number (`ParcelNum`), site address (`Address`) and the
  owner mailing address (`MailAddress1`, `MailCity`). String fields are
  space padded, so match with `LIKE 'SMITH%'`. The layer is in wkid 102667,
  so request `outSR=4326` for longitude and latitude. No license is stated.
- **Alabama:** Mobile County (FIPS 01097), with a verified endpoint on the
  Mobile County Revenue Commission's `MCRC_Public_Parcels` FeatureServer
  (214,040 parcels, updated 2026-09-22). Searchable by owner name (`Name1`,
  `Name2`), parcel number (`Parcel_Number`) and site address (`PropAddr1`).
  The layer has no owner mailing-address columns. String fields are space
  padded, so match with `LIKE 'SMITH%'`. The layer is in wkid 102630, so
  request `outSR=4326` for longitude and latitude. No license is stated.
- **Oregon:** Malheur County (FIPS 41045, Vale), with a verified endpoint on
  the county's `County_GIS_Portal_WFL1` FeatureServer (20,570 tax lots).
  Searchable by owner name (`OWNERSNAME`), map and taxlot id (`MapTaxlot`),
  site address (`SITUSADD`, `CITY`) and the owner mailing address (`ADD1`,
  `CITYSTATE`). The layer name and index are month-stamped (`TL Jun2026`,
  layer 16) and the county republishes monthly. A client that finds the
  layer gone should list the FeatureServer's layers and pick the one whose
  name starts with `TL ` and which carries `OWNERSNAME`. No license is
  stated.
- **Washington:** Island County (FIPS 53029, Coupeville), with a verified
  endpoint on the Assessor's `Geocortex/Base` MapServer layer 0. Searchable
  by owner name (`taxpayer`), parcel id (`ParcelNo`), site address
  (`physical_addr`) and the owner mailing address (`mailing_addr1`,
  `mailing_addr_city`). Values carry trailing spaces, so trim them. CORS
  reflects the request origin rather than answering `*`. No license is
  stated.

Georgia, Alabama, Oregon and Washington were already registered in
`POPULATED_STATES`, so
`src/*.ts` is unchanged and only `data/` grew. Deliberately a **patch**, for
the reason 0.6.5 gave: adding county rows to an already-registered state is
the 0.6.1 shape, and `^0.6.0` reaches everyone already installed.

## 0.6.9 — 2026-09-26

Adds the District of Columbia and fixes one helper. `totals` move from
**234 counties / 246 endpoints** to **235 counties / 247 endpoints**; 229 of
the 235 now carry a verified endpoint (was 228 of 234). `totals.states` moves
from 50 to 51 because the index now lists DC beside the 50 states. It is not
a state, so count `listStates()` entries by `slug` if you need states only.

### Added: the District of Columbia

- `data/index.json` gains a populated `district-of-columbia` entry (abbrev
  `DC`), and `data/district-of-columbia.json` carries one record: `District
  of Columbia`, FIPS 11001, countySlug `district-of-columbia`, on DC GIS's
  Owner Polygons layer (Property_and_Land_WebMercator FeatureServer, layer 40).
- Registered in `POPULATED_STATES`, so `findState("district-of-columbia")`,
  `findCounty("district-of-columbia", "district-of-columbia")`,
  `listCountiesByState` and `atlas.byStateSlug` resolve it. `listStates()`
  returns 51 entries.
- The District has no counties. Its one record is the District itself, the
  county equivalent the Census Bureau lists as 11001. The layer maps land, one
  polygon per lot. A condominium building is a single lot on it, usually with
  no owner name, so an owner search finds lot owners, not unit owners.

### Fixed: `countySlugFromName` knew four unit names

It recognised County, Parish, Borough and Census Area and appended " County"
to every other name: `countySlugFromName("Anchorage Municipality")` returned
`anchorage-municipality-county` while the bundled record is
`anchorage-municipality`. The same was true of the nine Connecticut planning
regions and Massachusetts' `Statewide` record. It now uses the site's rule,
which also knows Municipality, City, Statewide, Planning Region and District
of Columbia, and it trims the name first. A name ending in `City` now slugs as
it stands, which is right for the independent cities and wrong for two
Virginia counties the registry does not carry, James City County and Charles
City County, whose base names end in City: the old rule gave
`james-city-county`, this one gives `james-city`. If either joins the
registry its stored name is the full `James City County`. If you stored slugs
this function produced for one of those names, they change; the bundled
`countySlug` values do not.

This is a **patch** for the reason 0.5.3 gave: `^0.6.0` has to reach everyone
already installed.

## 0.6.8 — 2026-09-26

Data refresh. No API change. `totals` move from **233 counties / 245
endpoints / 50 states** to **234 counties / 246 endpoints / 50 states**;
228 of the 234 now carry a verified endpoint (was 227 of 233).

### Data refresh — one county added, one record corrected

- **Ohio:** Mahoning County, with a verified endpoint. Its parcel layer
  answers only `outFields=*`: a query that names its fields is refused
  with "Failed to execute query." The record's `sampleQuery` already sends
  `outFields=*` and its `notes` record the quirk, so a client that builds
  its own query should request every field and read the columns it needs.
- **Mississippi:** Hinds County's layer (MDEQ OPCGIS, HINDS_PARCELS) now
  refuses a named `outFields` list the same way, measured 2026-09-26 on
  the enrichment, radius and liveness query shapes; it answered a named
  list in May. Its `sampleQuery` now sends `outFields=*`, its `notes` say
  so, and `lastVerified` moves to 2026-09-26. The record also stops listing
  `MAILADD1`, `MCITY1`, `MSTATE1` and `MZIP1` under `searchFields`: those
  columns exist in the layer's schema but are blank on every one of its
  114,814 parcels (`returnCountOnly` with `<field> IS NOT NULL AND <field>
  <> ''` counts 0 for each, against 114,547 for `OWNNAME` and 114,514 for
  `SITEADD`, measured 2026-09-26), so the county serves owner names and
  site addresses, not mailing addresses, and a client reading
  `searchFields` for a mailing column no longer finds one there. No count
  changes.

Ohio was already registered in `POPULATED_STATES`, so `src/*.ts` is
unchanged and only `data/` grew. Deliberately a **patch**, for the reason
0.6.5 gave: adding county rows to an already-registered state is the 0.6.1
shape, and `^0.6.0` reaches everyone already installed.

## 0.6.7 — 2026-09-26

Data refresh. No API change. `totals` move from **227 counties / 241
endpoints / 50 states** to **233 counties / 245 endpoints / 50 states**;
227 of the 233 now carry a verified endpoint (was 223 of 227).

### Data refresh — six counties in four registered states

- **Michigan:** Lenawee County, with a verified endpoint, and Iron County,
  which ships with `hasPublicRest: false`. Iron's map viewer has no public
  query API, and Michigan has no statewide parcel layer to fall back on.
- **California:** Riverside County. Its public layer carries APN, situs and
  mailing address but no owner name, and `capabilityOverrides.owner_name`
  records that as `not_published`.
- **Maryland:** Baltimore County, the county rather than Baltimore City.
- **Oregon:** Coos County, with a verified endpoint, and Clackamas County,
  which ships with `hasPublicRest: false` because the county does not
  publish owner names online.

All four states were already registered in `POPULATED_STATES`, so `src/*.ts`
is unchanged and only `data/` grew. Deliberately a **patch**, for the reason
0.6.5 gave: adding county rows to an already-registered state is the 0.6.1
shape, and `^0.6.0` reaches everyone already installed.

## 0.6.6 — 2026-09-22

**No API change and no data change.** `totals` stay at **227 counties / 241
endpoints / 50 states**, `src/` is untouched, and `data/` is byte-identical to
0.6.5. If you are on 0.6.5 you gain nothing functional by upgrading.

What you gain is that you can **verify where this came from**. 0.6.6 is the
first release of this package published with a [provenance
attestation](https://docs.npmjs.com/generating-provenance-statements): npm
attaches one only on an OIDC publish from a **public** repository, and every
release up to and including 0.6.5 was published from a private one, so none of
them could have had it. From 0.6.6 the package publishes from
[`urbankitstudio/atlas`](https://github.com/urbankitstudio/atlas), and
`npm view @urbankitstudio/atlas` will show the signed link back to the commit
and workflow run that built the tarball.

The package is still **authored** in the private monorepo — `data/` is generated
from the parcel registry that lives there — and mirrored out. So the source of
truth has not moved; only the thing that presses publish has.

Deliberately a **patch**, for the same reason 0.5.3, 0.6.1 and 0.6.5 gave: the
README says to pin `^0.x`, and `^0.6.0` resolves to `>=0.6.0 <0.7.0`, so a patch
reaches everyone already installed. A release that changes no API and no data is
exactly what a patch is for, and a `0.7.0` would reach nobody without a manual
bump — which would be the wrong shape for a change whose whole point is that
existing users get a verifiable artifact.

## 0.6.5 — 2026-09-20

Data refresh. No API change. `totals` move from **171 counties / 174
endpoints / 50 states** to **227 counties / 241 endpoints / 50 states**;
223 of the 227 now carry a verified endpoint (was 166 of 171).

### Data refresh — Florida

- **Florida: 11 → 67 counties, 10 → 77 endpoints.** Every Florida county is
  now registered, not just the largest ten. Florida was already a populated
  state (registered in `POPULATED_STATES` since before this release), so
  `findState`/`findCounty`/`listCountiesByState`/`atlas.byStateSlug` needed
  no source change — only `packages/atlas/data/florida.json` and
  `data/index.json` grew. `src/*.ts` is unchanged by this release.

Deliberately a **patch**, for the reason 0.5.3 and 0.6.1 gave: the README
says to pin `^0.x`, and `^0.6.0` resolves to `>=0.6.0 <0.7.0` — so this
reaches everyone already installed, and a `0.7.0` would not. Adding county
rows to an already-registered state is exactly the 0.6.1 shape (Connecticut's
nine planning regions, the four NYC boroughs), not the 0.4.0/0.5.0 shape
(registering a *new* state key, which changes what an existing function
returns for inputs it previously answered `undefined` for).

## 0.6.4 — 2026-09-18

Data corrections. No API change. `totals` stay at **171 counties / 174
endpoints / 50 states**; five of those counties publish no endpoint, and the
README's coverage sentence is now checked against the data by a test, because
the prose had been wrong twice.

- New York: the four boroughs that shared the id `ny-new-york` are now
  `ny-bronx`, `ny-kings`, `ny-queens` and `ny-richmond`.
- South Carolina: Charleston County's parcels moved from `MapServer/61` to
  `MapServer/4`; re-pointed and re-verified 2026-09-17.
- Texas: Fort Bend renamed its fields (`OwnerName` → `Owner_Name` and the
  rest); re-pointed rather than dropped, re-verified 2026-09-12.
- California: San Diego's record now explains that every owner name comes back
  as the literal `Protected Per CA Gov Code 7928.205`.
- Manifest: keywords gain `real-estate` and `property`; the README carries the
  Socket badge.

`^0.6.0` reaches everyone already installed.

## 0.6.3 — 2026-09-03

Metadata only. No data or API change. The package author, the license
holder and the README credit now name UrbanKit Studio instead of an
individual. `^0.6.0` reaches everyone already installed.

## 0.6.2 — 2026-09-02

Data corrections only. No API change. `totals` are now **171 counties / 174
endpoints / 50 states**. A patch for the reason 0.6.1 gave: `^0.6.0` reaches
everyone already installed.

### Fixed — Oregon

- **Multnomah County pointed at Umatilla County's tax lots.** The layer's own
  description reads "a Umatilla County GIS layer depicting land partition and
  ownership within Umatilla County" (copyright Umatilla County GIS, 44,849 tax
  lots, and Multnomah's own layer counts 284,409). Multnomah now carries Multnomah County's
  own Tax Parcels layer on services5.arcgis.com: 56 fields, owner `NAME`,
  mailing `ADDR1`/`CITY`/`STATE`/`ZIP`, `SITUSADDR`, `DEED_DATE`, `SALE_DATE`,
  `SALE_PRICE`. Owner query verified live 2026-09-02.
- **Lane County's path answered 404 "Service not found" on 2026-09-01** and was live again on
  2026-09-02 (75 fields, owner query returns rows). The entry keeps its path, re-verified, and its
  notes name the county's other publication of the same parcels, `AT/AddressParcelSales/MapServer/2`
  (26 fields), as the fallback if the path drops again.

### Added

- **Umatilla County, OR (41059)**: the tax lots layer that had been filed
  under Multnomah, now under its own county (owner `MAILING_NA`, mailing
  address, situs fields).

### Tooling

- `scripts/audit-atlas-county-names.mjs` asks every endpoint who it says it is
  (layer and service metadata) and flags one that names another county of its
  state and not its own. Across all 174 endpoints on 2026-09-02 the only flags
  are statewide layers (Montana cadastral, Utah LIR) and New York City's
  MapPLUTO, which name several counties by design.

## 0.6.1 — 2026-08-29

Data corrections only; no API change. `totals` are now **170 counties / 173
endpoints / 50 states** (0.6.0 shipped 155 / 155 / 50).

Deliberately a **patch**, for the reason 0.5.3 gave: the README says to pin
`^0.x`, and `^0.6.0` resolves to `>=0.6.0 <0.7.0` — so this reaches everyone
already installed, and a `0.7.0` would not. Every change below corrects a claim
a consumer could act on, and a correction is worth nothing if it does not
arrive.

### Fixed — claims about what a county can answer

- **Six counties no longer advertise owner-name search** their layers cannot
  answer (#530), and eight owner advisories that turned out to be FALSE were
  reverted (#541) — the audit predicate behind them (`COL <> ''` on an
  Oracle-backed layer) compares against NULL and is never true. The corrected
  audit re-ran across all 170 counties (#543).
- **El Paso County CO** declares `situs_address` and `owner_mailing_address`
  as `not_published`: the columns exist and are null on every row, verified
  against a Denver control on the same layer (#543, #545).
- **Cuyahoga County OH** re-pointed to the Fiscal Office's live layer after the
  county stopped its MyPLACE service; mailing address is now available there
  (#558). **Greenville County SC** and **Orleans Parish LA** are marked
  `unreachable`, with the measurement in `notes` (#558).

### Added — counties and scoping

- **Connecticut** as its nine planning regions (Connecticut has no counties as
  Census geography; the retired county FIPS codes never resolved) (#538).
- **Four NYC boroughs** and **Wayne, Macomb, Montgomery, Bucks, Chatham** (#529,
  #531).
- Every county sharing a statewide layer now carries a `scopeWhere` (#529,
  #534, #558) — previously an owner search on a shared layer could return
  statewide matches under one county's name.

### Housekeeping

`package-lock.json` still said 0.5.3 (never bumped at 0.6.0); the README said
155 counties; and this package's own test suite pinned 155 and had been red,
unrun, since the data grew — `prepublishOnly` would have refused to publish.
All corrected here, and a root-suite guard now keeps the pins honest.

## 0.6.0 — 2026-08-13 (entry written retroactively on 2026-08-29)

Shipped without a changelog entry; this records it. `CountyRecord` in the
published SDK had eleven fields while the registry it mirrors has sixteen —
everything a human had reviewed (`ownerFieldNote`, `dataVintage`,
`capabilityOverrides`, the related-city slugs) was in the bundle but
unreachable through the public type. 0.6.0 exposed the reviewed capability to
SDK consumers and documented why it does not derive (#409). Minor, because the
public type widened.

## 0.5.3 — 2026-08-05

Says plainly that `status` is not a live signal. No data changes; `totals` are
unchanged (155 counties / 155 endpoints / 50 states).

Deliberately a **patch**, not a minor. The README tells you to pin `^0.x`, and
for a `0.x` release `^0.5.2` resolves to `>=0.5.2 <0.6.0` — so a `0.6.0` would
not reach anyone already installed. The point of this release is to correct a
misleading claim, which is worth nothing if it does not arrive.

### Fixed — a claim that read as a live signal

`status` and `lastVerified` describe what was true **when the version you
installed was published**. This package ships static JSON and makes no network
calls, so it cannot know anything more recent. `status: "live"` therefore means
"a check passed before publish", not "this endpoint is up right now".

The gap is real and was measured: on 2026-08-04, Will County IL was being served
as `status: "live"`, `lastVerified: "2026-06-27"` while the liveness probe had it
**down with 4 consecutive failures**.

### Added

- **`LIVE_STATUS_URL`** — exported as a runtime value so nobody hardcodes the
  endpoint. Points at `https://urbankitstudio.com/api/atlas/status`: keyless,
  refreshed every two hours.
- Type-level documentation on `EndpointStatus`, `status` and `lastVerified`
  explaining what each actually asserts — visible in your editor on hover.
- README section covering the two answers people get wrong: **`found: false`**
  means no observation exists (the county may be untracked, or never probed), and
  a **503** means the health store was unreachable. Neither says the endpoint is
  up. Treat both as unknown.

## 0.5.2 — 2026-08-05

Data content patch. Published without a changelog entry at the time; recorded
here after the fact.

### Data refresh

- Resynced `packages/atlas/data/` to `public/data/atlas/`, clearing **all
  remaining dead-host endpoint references**. Montana moved to
  `gisservice.mt.gov/.../MapServer/1`. Verified against the published tarball:
  58 files, 51 state JSONs, zero dead-host references.

## 0.5.1 — 2026-07-20

Data content patch. No new counties, no API changes — `totals` are unchanged
(155 counties / 155 endpoints / 50 states).

### Data refresh

- Resynced `packages/atlas/data/` to `public/data/atlas/`, which had drifted
  ahead since the 0.5.0 sync (2026-06-28):
  - **King County, WA** — `notes` updated to replace the dead-end reference to
    `tise-fzs9` (a Metro vanpool-ridership dataset, not parcels) with the two
    live Socrata tables that carry King County's PIN format: Property Legal
    Descriptions (`4854-i48r`, filter by `parcel_number`) and Real Property
    Tax Receivables (`dkna-i698`, filter by `account_number`). Resolve an
    address to a PIN via eReal Property or Parcel Viewer first, then query
    either table with that PIN.
  - **Will County, IL** — added `ownerFieldNote`, a `CountyAdvisory` pointing
    consumers to the Will County Supervisor of Assessments' property search
    portal, since the public parcel REST layer exposes only the PIN (no
    owner-name or address field).
  - `data/index.json`: content (totals, `lastUpdated`, `states`) synced
    verbatim from `public/data/atlas/index.json`; the `version` field is kept
    on the SDK's own release lineage (0.5.0 → 0.5.1) rather than copied from
    the main site's independent content-version field (which reads `0.3.0`
    and tracks separately) — consistent with how this field has been set at
    every prior sync (0.1.0 → 0.5.0).

### Breaking changes

None. Data-content correction only. Pin `^0.x` to track patches.

## 0.5.0 — 2026-06-28

Data resync to the live atlas (**128 → 155 counties**). All 50 US states are
now populated.

### Data refresh

- Synced `packages/atlas/data/` to `public/data/atlas/` (+27 counties). Eleven
  states gained their first verified endpoints: Arkansas, Delaware, Hawaii,
  Maryland, Montana, New Mexico, North Dakota, Oklahoma, South Dakota,
  West Virginia, and Wyoming. Populated coverage went from 39 to all 50 states;
  several existing states also grew. `data/index.json` totals now read 155
  counties / 155 endpoints across 50 states.
- Registered the eleven new states in the SDK's `POPULATED_STATES` map so
  `findState` / `findCounty` / `listCountiesByState` / `atlas.byStateSlug`
  resolve them. The smoke test's full-coverage guard (every `populated: true`
  state resolves through `byStateSlug`) now pins all 50.

## 0.4.0 — 2026-05-31

Data resync to the live atlas (**117 → 128 counties**) plus a new FIPS lookup
and a registry fix that makes 14 already-bundled states actually reachable.

### New API

- `findCountyByFips(fips)` — look up a county by its 5-digit county FIPS code
  (state FIPS + county FIPS, e.g. `"17089"` → Kane County, IL). Scans all
  populated states. Non-5-digit / unknown / non-string input returns
  `undefined`; it never throws.

### Bug fixes

- **14 bundled states were unreachable.** v0.3.0 shipped data files for
  Alabama, Alaska, Connecticut, Idaho, Kentucky, Louisiana, Maine,
  Massachusetts, Mississippi, New Hampshire, New Jersey, Rhode Island,
  South Carolina, and Vermont, but they were never added to the SDK's
  `POPULATED_STATES` map — so `findState` / `findCounty` / `listCountiesByState`
  / `atlas.byStateSlug` returned `undefined`/empty for all of them despite the
  JSON being present in the package. All 39 populated states are now registered.
  A new smoke test pins that every `populated: true` state in the index resolves
  through `byStateSlug` so this can't regress.

### Data refresh

- Synced `packages/atlas/data/` to `public/data/atlas/` (+11 counties). Notable
  growth since v0.3.0: Florida 7 → 11, Texas 5 → 10, Ohio 5 → 7. Package
  `data/index.json` totals now read 128 counties / 128 endpoints across 50
  states (39 populated).

### Breaking changes

None. New function + additive data only. Pin `^0.x` to track minor adds.

## 0.3.0 — 2026-05-16 (consolidated overnight expansion)

Atlas grew **36 → 117 counties** across **17 → 39 populated states**. Five
parallel expansion batches landed PRs #34, #35, #36, #37 + earlier #28.

### New counties (81 added since v0.1.0)

**Batch 1 (PR #28)** — 10 counties: Orange CA, San Bernardino CA, San Diego CA,
El Paso CO, Jefferson CO, Marion IN, Mecklenburg NC, Multnomah OR, Davidson
TN (Nashville), Salt Lake UT. Added IN/OR/TN/UT as new states.

**Batch 2 (PR #34)** — 10 Tier-2 metros: Erie NY (Buffalo), Monroe NY
(Rochester), Onondaga NY (Syracuse), Hamilton OH (Cincinnati), Ada ID (Boise),
Dane WI (Madison), Milwaukee WI, Bergen NJ, Hartford CT (statewide CT CAMA),
Anchorage AK (statewide AK). Added ID/WI/CT/AK as new states.

**Batch 3 (PR #36)** — 15 Pacific NW + West: Lane OR (Eugene), Marion OR
(Salem), Spokane WA, Snohomish WA, Thurston WA (Olympia), Davis UT, Utah UT
(Provo), Weber UT (Ogden), Washoe NV (Reno), Pinal AZ, Santa Clara CA,
Alameda CA, Contra Costa CA, Sacramento CA, Ventura CA. (CA-suppressed-owner
counties indexed for completeness; OR/WA/UT/AZ varies by state law.)

**Batch 4 (PR #32)** — 11 Northeast entries: Suffolk MA + Middlesex MA +
Worcester MA + Norfolk MA + Essex MA + Plymouth MA (via MassGIS L3 statewide
composite, one entry), Chittenden VT (Burlington), Cumberland ME + York ME,
Monmouth NJ + Ocean NJ + Camden NJ + Morris NJ (NJOGIS statewide + Monmouth
direct), Hillsborough NH + Rockingham NH (no public REST documented),
Providence RI (no public REST documented). Added MA/VT/ME/RI/NH as new states.

**Batch 5 (PR #37)** — 20 Southeast counties: Duval FL (Jacksonville),
Manatee FL, Sarasota FL, Cobb GA (Atlanta NW), DeKalb GA (Atlanta east),
Forsyth NC, Guilford NC, Cumberland NC, Buncombe NC, Durham NC, Greenville SC,
Charleston SC, Jefferson AL (Birmingham), Shelby TN (Memphis), Hamilton TN
(Chattanooga), Hinds MS (Jackson), DeSoto MS, East Baton Rouge Parish LA,
Orleans Parish LA (New Orleans), Fayette KY (Lexington). Added AL/SC/MS/LA/KY
as new states. Also: corrected Broward FL endpoint from FDOR statewide
(partitioned, unreliable cross-county filter) to BCPA's own server.

**Batch 6 (PR #35)** — 15 Midwest counties: Kent MI (Grand Rapids), Oakland MI
(Detroit NW), Ramsey MN (St. Paul), Waukesha WI, Brown WI (Green Bay),
Hamilton IN (Indy suburbs), Allen IN (Fort Wayne), Montgomery OH (Dayton),
Stark OH (Canton), Johnson IA (Iowa City), St. Louis County MO, Shawnee KS
(Topeka), Douglas NE (Omaha), Lancaster NE (Lincoln), Sarpy NE. Added
MI/IA/MO/KS/NE as new states.

### New states (22 added since v0.1.0)

Alabama, Alaska, Connecticut, Idaho, Indiana, Iowa, Kansas, Kentucky,
Louisiana, Maine, Massachusetts, Michigan, Mississippi, Missouri, Nebraska,
New Hampshire, New Jersey, Oregon, Rhode Island, South Carolina, Tennessee,
Utah, Vermont, Wisconsin.

### Engineering / hygiene fixes

- **Data sync**: 5 counties (Pima AZ, Suffolk NY, Westchester NY, Dallas TX,
  Bexar TX) were in `public/data/atlas/` but missing from `packages/atlas/data/`
  in v0.1.0 and v0.2.0. Synced — these counties now ship in the npm package.
- **State registration**: indiana, oregon, tennessee, utah, maine, massachusetts,
  new-hampshire, new-jersey, rhode-island, vermont, alaska, connecticut, idaho,
  wisconsin, michigan, iowa, missouri, kansas, nebraska, alabama, south-carolina,
  mississippi, louisiana, kentucky added to the SDK's POPULATED_STATES map.
- **Auto-prerender**: `scripts/sync-prerender-routes.mjs` (in the main app, not
  the SDK) now auto-generates the reactSnap include list from atlas data — no
  more manual route-list updates per atlas expansion.

### Known non-issues

- Several counties don't expose owner-name on their public REST layer due to
  state law (CA Gov Code 7928.205, WA RCW 42.56.070(8)) or county policy.
  These are still indexed for completeness — the atlas marks each county's
  searchable fields, so downstream consumers can filter for owner-name
  availability.
- NH Hillsborough + NH Rockingham + RI Providence: no public REST documented.
  Indexed with empty endpoints so atlas consumers can show "Not Yet Indexed"
  banners + invite contributions.

### Breaking changes

None. Backward-compatible additions only. Pin `^0.x` to track minor adds.

## 0.2.0 — 2026-05-15

(Superseded by 0.3.0 — see above for the consolidated changelog covering all
expansion batches that landed between v0.2.0 and v0.3.0 publish.)

- Added 10 new counties: Orange CA, San Bernardino CA, San Diego CA, El Paso
  CO, Jefferson CO, Marion IN, Mecklenburg NC, Multnomah OR, Davidson TN, Salt
  Lake UT
- Added 4 new states: Indiana, Oregon, Tennessee, Utah
- Atlas: 46 counties across 21 states

## 0.1.0 — 2026-05-15

- Initial public release
- 36 counties across 17 states
