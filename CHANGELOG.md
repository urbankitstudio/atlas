# @urbankitstudio/atlas Changelog

## 0.6.33 — 2026-10-14

City data. No API change, no breaking change, `totals` unchanged. The city
registries grow from 20 to **30 cities** with code-violation or building-permit
datasets and from 17 to **19** with zoning-case dockets. Every endpoint, address
column, date column and scope filter was re-read live on 2026-10-14, and each
new dataset carries `latestRecordDate`, the newest record seen that day.

### New code-violation and building-permit cities

- **Los Angeles CA**: LADBS open code-enforcement cases (`u82d-eh7z`; closed
  cases sit in a separate dataset that is not searched) and building permits
  issued since 2020 (`pi9x-tg5x`). The violations table splits the street, so
  a typed "number name" is matched on `stno` and `stname`.
- **Fort Worth TX**: code violations and development permits (ArcGIS tables).
  The permits table's one-line address column is empty upstream, so permits
  match the street name on `Street_Name` and the house number on `Addr_No`.
  Trade permits are included.
- **Mesa AZ**: code-compliance cases and issued building permits (Socrata).
- **Minneapolis MN**: code violations and permits (ArcGIS).
- **Wichita KS**: MABCD code cases and permits (the city's own ArcGIS server).
  The permits layer is scoped to `Jurisdiction='Wichita'`. The county name is
  Sedgwick County, which the atlas does not carry, so no `countySlug`.
- **Cleveland OH**: Building and Housing violation notices and building permits
  (ArcGIS), each with its Accela Citizen Access link.
- **New Orleans LA**: code-enforcement cases and permits (Socrata, CC0).
- **Orlando FL**: code-enforcement cases scoped to the housing, lot, zoning,
  abatement and commercial case types, and permit applications (Socrata).
- **Cincinnati OH**: code-enforcement complaints scoped to
  `display_agency like 'Cincinnati%'` (the table is Hamilton County-wide) and
  building permits (Socrata).
- **Scottsdale AZ**: closed code complaints since 2021-09 (split street, matched
  on `StreetNumber` and `StreetName`) and building permits (the city's own
  ArcGIS server).

### New zoning-case cities

- **Orlando FL**: Planning Applications scoped to the Zoning application type.
  Existing and proposed zoning live in the comments prose, not in columns.
- **Scottsdale AZ**: the ZN (rezoning) series of the planning-case table.
  Thin: about 6 rezonings since 2025-04.

### County links

`relatedPropertyCitySlug` now names a city for Los Angeles CA, Tarrant TX,
Hennepin MN, Cuyahoga OH, Hamilton OH, Orleans LA and Orange FL counties;
`relatedZoningCitySlug` for Los Angeles CA, Tarrant TX, Orleans LA, Orange FL
and Maricopa AZ (Scottsdale; Maricopa's property link stays Phoenix).

### Disclosures

- The hosted MCP `get_city_datasets` now returns `zoning_source` whenever the
  zoning registry carries a `currentRecordsNote`, not only when its source URL
  differs from the property source, so Orlando's and Scottsdale's zoning notes
  reach agents on the default call. Additive: no field renamed.
- Dataset `coverage` now states the measured search limits: Orlando's
  double-spaced addresses (search by street name alone), the split-street
  datasets (LA violations, Fort Worth permits, Scottsdale violations: a street
  typed without a house number is matched as typed, so a suffix finds nothing),
  Wichita's null-jurisdiction permits, Cincinnati's departments with their
  shares, and Scottsdale's sparse Zoning column.
- Types: `CitySource` (the zoning record's `source`) gains the optional
  `currentRecordsNote` its data already carried. Additive.

## 0.6.32 — 2026-10-14

New counties — Berks PA (42011), Bedford PA (42009), Salem city VA (51775),
Nueces TX (48355), Hidalgo TX (48215), Brazos TX (48041), Ector TX (48135) and
Webb TX (48479, a researched stub with no public REST). No API change, no
breaking change. `totals` move from 306 counties / 324 endpoints (298 with a
verified endpoint) to **314 counties / 331 endpoints** (305). Callers asked for
all eight.

### New counties

- **Berks PA (42011)**, with a verified endpoint on PASDA, the Penn State
  clearinghouse that hosts the county's data (`BerksCounty` MapServer layer 6,
  156,838 parcels): owner, situs, owner mailing address and the 14-digit parcel
  id are searchable, and the layer answers cross-origin requests. The layer is a
  January 2026 snapshot, and PASDA republishes under a new vintage stamp, so the
  layer name or index may move; the `notes` say how to find it again.
- **Bedford PA (42009)**, with a verified endpoint on PASDA (`BedfordCounty`
  MapServer layer 0, 34,225 parcels). The layer is the July 2023 vintage and
  situs is filled on only about 26 percent of rows, so an address search misses
  most parcels; owner, parcel id and a point lookup are the dependable paths. The
  `notes` record both.
- **Salem city VA (51775)**, an independent city, with a verified endpoint on the
  city's own ArcGIS Online (`TaxParcels` FeatureServer layer 5, 10,765 parcels,
  edited the day before verification). The mailing street is `owner_address2`;
  `owner_address1` is a care-of line on about 8 percent of rows.
- **Nueces TX (48355)**, with a verified endpoint on the ArcGIS Online
  organisation of the appraisal district's GIS vendor (`NuecesCADWebService`
  FeatureServer layer 0, 157,404 parcels, edited on the day of verification).
  The site address is split across `situs_num` and `situs_street`, so an address
  search runs on the street word; the `notes` say so.
- **Hidalgo TX (48215)**, with a verified endpoint on the regional 911 district's
  server (`RGV911_Web_Apps_MIL1` MapServer layer 7, 334,098 parcels). Situs is
  one full string; the mailing column is the street line only, with no mailing
  city, state or ZIP.
- **Brazos TX (48041)**, with a verified endpoint on the City of Bryan's server
  (`BRAZOS_COUNTY_CERTIFIED_PARCELS` MapServer layer 0, the 2025 certified roll,
  75,652 parcels, whole county). Empty source fields were written as the text
  `NULL`, and most `SitusAddr` values end in ` NULL`; the data is shipped as
  published and the `notes` say how to query around it.
- **Ector TX (48135)**, with a verified endpoint on the appraisal-software
  vendor's server (`EctorCounty_Basemap` MapServer layer 0, 77,042 parcels).
  The layer publishes NO situs column: owner, a one-line mailing address and the
  PIN are searchable, and an address lookup has to go through a geocoded point.
- **Webb TX (48479)**, no public endpoint: `hasPublicRest: false` and an empty
  `endpoints` array. Webb CAD's map host answers with a login page, and the only
  public Webb layers on ArcGIS Online are partial. The `notes` record the
  evidence as of 2026-10-14.

## 0.6.31 — 2026-10-12

City datasets. New export, no breaking change, `totals` unchanged. The package
now bundles the two city registries urbankitstudio.com serves at
`/data/city-property/` and `/data/city-zoning/`: 20 cities with verified
code-violation or building-permit datasets and 17 with zoning-case dockets
(`data/city-property/`, `data/city-zoning/`), and describes how to query each
one the way the site does.

- `listCities(filter?)`, `findCity(ref, state?)` (slug, name, "Name, ST", the
  NYC and DC aliases; ambiguity is a list), `getCityProperty(slug)`,
  `getCityZoning(slug)`, `cityDatasets(slug, kind?)`, `citiesForCounty(stateSlug,
  countySlug)`, `cityPath(slug, kind)`.
- `buildCityQuery(dataset, street)` returns the exact URL the site sends for a
  dataset and a typed street (Socrata, ArcGIS, CKAN or CARTO), with the site's
  quote-doubling guard; null when the lookup needs a geocoded point or a parcel
  id first, in which case `dataset.queryTemplate` carries the request with a
  `{LON},{LAT}` placeholder. Address lookups carry no template on purpose: a
  street must be escaped for the provider's SQL, and only `buildCityQuery` does
  that. LIKE wildcards (`%`, `_`) in a street stay active, as on the site; each
  `queryNote` says so.
- Each `CityDatasetDescriptor` carries the provider, endpoint, lookup mode,
  address and date columns, the scope `where` that is part of the dataset's
  definition, the field map, status buckets, coverage, a freshness block, the
  point template where one applies, a newest-first `sampleQuery` and a `queryNote`.
- County records' `relatedZoningCitySlug` and `relatedPropertyCitySlug` now
  resolve inside the package through `getCityZoning` / `getCityProperty`.
- Split addresses. A dataset whose table keeps the house number in its own
  column (`addressParts`: Dallas violations, Boston, Chicago, NYC and San
  Francisco, plus the Boston and Indianapolis dockets) is matched on the street
  NAME: `buildCityQuery` takes the typed house number off, then a leading
  directional when the table has a direction column, then one trailing street
  type when it has a type column (`streetForDataset`, `splitAddressStreetName`;
  the roles follow the column order of `addressParts`). A name column holds
  "MARILLA" while "1500" and "ST" sit elsewhere, so the typed line as one
  substring finds almost nothing (Dallas, 2026-10-13: 101 of 109 Marilla rows
  carry the type in `str_suffix`). The page's own URL stays `propertyQueryUrl`
  / `casesQueryUrl`; a `streetNumber` mapping, which no shipped city sets yet,
  matches number and name on both columns instead.
- Nothing fetches. For volume against a Socrata dataset, send your own
  `X-App-Token`.
- Boston's zoning record no longer names `suffolk-county`, which the atlas
  does not carry (Massachusetts is statewide); its county name stays.

## 0.6.30 — 2026-10-12

0.6.30: endpoint capability keys supportsPagination and maxRecordCount,
offersPagination() reader; no data change. Builds on 0.6.29. `totals` do not move, and no
bundled endpoint carries either key yet. No breaking change.

Some ArcGIS layers refuse pagination: any `resultRecordCount` or
`resultOffset`, in any letter case, gets HTTP 200 with
`{"error":{"code":400,"message":"Pagination is not supported."}}` instead of
rows. The atlas will register such layers (Mississippi's statewide parcel
layers are next), so the record can now say so before any of them ship.

### Added

- `EndpointRecord.supportsPagination?: false`. Only the literal `false` is
  written; absent means the layer pages. The name is Esri's own
  (`advancedQueryCapabilities.supportsPagination`).
- `EndpointRecord.maxRecordCount?: number`, the layer's declared per-query row
  cap, present on every flagged endpoint.
- `offersPagination(endpoint)`: `false` on a flagged layer. Check it before
  adding either parameter; when it is `false`, send one request without them
  and narrow the query when `exceededTransferLimit` comes back.

The registry's validator enforces, on every flagged endpoint: a positive
integer `maxRecordCount`, a `sampleQuery` with neither parameter, and the same
two values on every registration of the same layer URL.

## 0.6.29 — 2026-10-12

New counties, no API change, no breaking change. Builds on 0.6.28. `totals`
move from 303 counties / 322 endpoints to **306 counties / 324 endpoints**
(298 with a verified endpoint). All three were asked for through the site's free
tools. Jackson MS (28059), also asked for, is not in this release: the only
public layer for it has no pagination support, and the service's own probes
send a row cap, so it waits for a release that handles that.

### New counties

- **Racine WI (55101)**, with a verified endpoint on the county's own ArcGIS
  Enterprise server (`DataPortal/Parcels_NAD83_2011_STATEPLANE` FeatureServer
  layer 0, 84,684 parcels, updated nightly): owner, situs, owner mailing address
  and parcel id are searchable, pagination works, and the layer answers
  cross-origin requests.
- **Westmoreland PA (42129)**, with a verified endpoint on the county's own
  ArcGIS Enterprise server (`Upgrade/Parcels_AS400_VIEW_Upgrade` MapServer layer
  2, 191,739 parcels). The owner column `NAME` is a fixed-width 30-character
  string padded with trailing spaces, so an exact `=` never matches: search with
  `LIKE 'SMITH%'`, and the server rejects `TRIM()`. The service lives in a folder
  named `Upgrade`, so the URL may move; the `notes` say so.
- **Casey KY (21045)**, no public endpoint: `hasPublicRest: false` and an empty
  `endpoints` array. The Casey PVA publishes only through qPublic, the state
  server carries no Casey parcel service, and Kentucky has no statewide parcel
  layer yet. The `notes` record the evidence as of 2026-10-12 and the PVA office
  to ask.

## 0.6.28 — 2026-10-10

withholding: RESTRICTED markers and masked mailing. Data notes only, no API
change, no breaking change, no change to `totals`. Four county notes now say
how the service treats those values:

- New Hanover NC: an owner that reads "RESTRICTED" is a county redaction
  marker, so that row is withheld.
- Fulton GA: 41 rows whose owner is the county's RESTRICTED marker are withheld.
- Lake IL: 24 rows whose owner (taxpayer_name) is the county's RESTRICTED marker are
  withheld.
- Wood WV: 263 mailing values carry asterisks. 251 of them are fully masked
  (some keep the ZIP, some carry none) and are served as no mailing address;
  the other 12 are real addresses and are served.

On the service side (not in this package), "NOT RESTRICTED" and "NOT
CONFIDENTIAL" are not markers, and a mailing value counts as fully masked when
it is only asterisks and separators, at least one asterisk, with at most a
trailing ZIP or ZIP+4, or a run of three or more "#".

## 0.6.27 — 2026-10-10

New counties and a New York outage fix, no API change, no breaking change. `totals` move from 294
counties / 305 endpoints to **303 counties / 322 endpoints** (296 with a
verified endpoint). Each new county sits on a statewide layer the atlas already
carries, one registration per county scoped by that layer's county field:
the NC OneMap parcel aggregation (`cntyname`, as Forsyth and Montgomery use),
the Montana cadastral layer (`CountyName`, as Yellowstone uses) and the WVU
parcel layer (`COUNTY`, the state's alphabetical code, as Kanawha uses).

### New counties

- **New Hanover NC (37129)**, 103,489 parcels, owner on 99.8%.
- **Iredell NC (37097)**, 109,254 parcels. The site city is blank on every row.
- **Union NC (37179)**, 117,539 parcels. The site city is blank on every row.
- **Onslow NC (37133)**, 95,297 parcels.
- **Johnston NC (37101)**, 125,583 parcels. 68 owner rows carry an asterisk
  on a real name.
- **Brunswick NC (37019)**, 151,753 parcels, situs on 85%. The site city is
  blank on every row.
- **Gallatin MT (30031)**, 53,618 parcels, TaxYear 2026, situs on 83.7%.
- **Berkeley WV (54003, code `02`)**, 62,652 parcels, situs on 98.3%.
- **Wood WV (54107, code `54`)**, 58,263 parcels. 263 mailing addresses are
  masked with asterisks.

NC rows carry no reliable per-county date (`revisedate` is null and the layer
publishes no editing info). West Virginia's layer says it was updated for Tax
Year 2023. North Carolina goes from 9 to 15 counties, Montana from 4 to 5 and
West Virginia from 4 to 6.

### New York outage fix

The state parcel server (`gisservices.its.ny.gov`) has hung on every query
since about 2026-10-09 16:00-18:00Z. Eight New York records gain the official
NYSGIS mirror of the same layer on ArcGIS Online (`services6.arcgis.com`,
FeatureServer/1, 2025 roll, last edited 2026-09-25, open CORS). Onondaga,
Suffolk and Westchester list the mirror first and keep the state endpoint
second; the five NYC boroughs list it third, behind MapPLUTO and the state
endpoint. Counties do not change, so only the endpoint total moves (+8).
The mirror carries no mailing address for the boroughs. A real owner name and
street address in the Onondaga note was replaced with a generic description.

## 0.6.26 — 2026-10-10

New counties, no API change, no breaking change. `totals` move from 286
counties / 297 endpoints to **294 counties / 305 endpoints** (287 with a
verified endpoint). All eight sit on the Colorado OIT statewide parcel
composite already used by El Paso and Jefferson, one registration per county
scoped by `countyName`. The layer is a state roll-up: each county's rows carry
the `dateReceived` the state loaded them (all 2026-03-27 to 2026-05-19), so
ownership can trail the county's own roll.

### New counties

- **Arapahoe CO (08005)**, 231,438 parcels, situs on 93%, mailing on 98%.
- **Adams CO (08001)**, 188,474 parcels, situs on 93%.
- **Larimer CO (08069)**, 180,960 parcels, situs on 88%.
- **Douglas CO (08035)**, 164,818 parcels, situs on 88%.
- **Weld CO (08123)**, 163,491 parcels, situs on 81%.
- **Boulder CO (08013)**, 144,551 parcels, situs on 99%.
- **Mesa CO (08077)**, 78,984 parcels. 650 carry the placeholder owner
  "Confidential Owner"; those rows are withheld, not served as a name.
- **Park CO (08093)**, 43,241 parcels, situs on 85%.

Pueblo (101,146 parcels) was checked and left out: the layer carries no situs
address for it. Colorado goes from 3 to 11 counties.

## 0.6.25 — 2026-10-10

New counties, no API change, no breaking change. `totals` move from 280
counties / 291 endpoints to **286 counties / 297 endpoints** (279 with a
verified endpoint). All six sit on the Arkansas GIS Office statewide parcel
layer, one registration per county scoped by `countyfips`, and none of them
publishes a mailing address (the layer has no mailing field).

### New counties

- **Clay AR (05021)**, requested by a visitor through the county-request form.
  16,324 parcels, owner populated on every row, situs on 69%.
- **Saline AR (05125)**, 80,143 parcels, situs on 96%.
- **Garland AR (05051)**, 76,870 parcels, situs on 99%.
- **Faulkner AR (05045)**, 66,634 parcels, situs on 88%.
- **Sebastian AR (05131)**, 60,283 parcels, situs on 91%.
- **Craighead AR (05031)**, 54,896 parcels, situs on 87%.

Arkansas goes from 3 to 9 counties.

## 0.6.24 — 2026-10-10

New counties, no API change, no breaking change. `totals` move from 277
counties / 288 endpoints to **280 counties / 291 endpoints** (273 with a
verified endpoint). Each was chosen for population and for publishing owner,
mailing address, situs and parcel id on a public layer.

### New counties

- **Chester PA (42029)**, with a verified endpoint on PASDA, Penn State's state
  clearinghouse (`pasda/ChesterCounty` MapServer layer 11, "Chester County
  Parcels 202610", 194,767 parcels, county-supplied). Owner, situs, owner
  mailing address and UPI are searchable, and the layer answers cross-origin
  requests. PASDA republishes monthly under a new vintage stamp, so the layer
  name (and possibly its index) rotates; the `notes` say how to re-resolve it,
  and that the older `maps.pasda.psu.edu/arcgis` copy is dead.
- **Gaston NC (37071)**, with a verified endpoint on the county's own
  `PublicGIS/Parcels` MapServer layer 11 (118,132 parcels). The layer carries
  three owner vintages; the record lists only the current-owner `CURR_`
  columns, not the January-1 (`JAN1_`) or prior-year (`PRVYR`) ones. No CORS
  header, so it is server-side only.
- **Clark WA (53011)**, with a verified endpoint on the county's own
  `MapsOnline/MailingLabels` FeatureServer layer 0 ("Owner Addresses", 196,284
  taxlots): owner, care-of, a complete owner mailing address, situs and the
  Assessor's property id, plus a parcel publish date (2026-10-09). The sibling
  `PropertyFinder` layer is not used because it has no date and no mailing
  city, state or ZIP. No CORS header, so it is server-side only.

## 0.6.23 — 2026-10-10

New counties, no API change, no breaking change. Builds on 0.6.22. `totals`
move from 273 counties / 284 endpoints to **277 counties / 288 endpoints**
(270 with a verified endpoint). All four were asked for through the site's free
tools.

### New counties

- **James City VA (51095)**, with a verified endpoint on the county's own
  ArcGIS Server (`JCC/GIS_Data` FeatureServer layer 17, 36,478 parcels):
  owner, situs, owner mailing address and PIN are searchable, and the layer
  answers cross-origin requests. The county's licence text asks that a
  disclaimer be placed on all products derived from the data; the `notes`
  quote it. The county's ArcGIS Online copy of the layer requires a token and
  is not used.
- **Hill TX (48217)**, with a verified endpoint on Hill CAD's
  `HillCADWebService` FeatureServer layer 0 (39,102 parcels), hosted on the
  appraisal district's GIS vendor's ArcGIS Online organisation. The situs is
  split over `situs_num` and `situs_street` (plus prefix and suffix); the
  record lists `situs_street` as the site-address column, so search an address
  by street name plus `situs_num`. 213 rows read `CONFIDENTIAL` as the owner
  (Texas Tax Code §25.025 withholding); the hosted API and MCP serve those rows
  with `withheld: "county-redacted"`, as described under 0.6.22. The
  vendor-hosted URL can move; the `notes` say so.
- **Greene MO (29077)**, with a verified endpoint on the City of Springfield's
  `Maps/GisViewerGroups` MapServer layer 18 (123,884 parcels), which covers the
  whole county, not only the city. The owner mailing address is one combined
  string. The layer publishes no vintage and no terms.
- **Georgetown SC (45043)**, parcel shapes only: the county's
  `GCGIS_OpenData` FeatureServer layer 2 (47,943 parcels) carries the TMS,
  plat and zoning and no owner, situs or mailing column, so the record carries
  an `ownerFieldNote` and `not_published` overrides for those three fields.
  The county publishes owners in a separate non-spatial table on the same
  service (layer 7, `PARCELATTRIBUTES`, keyed by TMS); the atlas registers one
  spatial layer per endpoint and does not join tables, so the `notes` describe
  the table and the two-query join rather than registering it.

## 0.6.22 — 2026-10-10

New counties, no API change, no breaking change. Builds on 0.6.21. `totals`
move from 257 counties / 268 endpoints to **273 counties / 284 endpoints**
(266 with a verified endpoint). Kentucky goes from one county to 17: 13 publish
owner names (Fayette plus 12 new) and 4 are parcel shapes only.

### New counties — Kentucky, with owner names (12)

Boone (21015), Warren (21227), Daviess (21059), McCracken (21145), Clark
(21049), Shelby (21211), Webster (21233), Franklin (21073), Simpson (21213),
Henry (21103), Montgomery (21173) and Meade (21163). Each record carries the
parcel id, the owner name, the owner mailing address, the situs address (Henry
has none) and the county's other columns as documented `searchFields`, and a
sample query on the owner column. Every layer answers cross-origin requests.

- **Withheld-address note.** Kentucky law lets judges (KRS 61.7991) and people
  in the Safe at Home program (KRS 14.304) have their home address withheld, so
  a county may blank an owner or label it `CONFIDENTIAL`. Each of the 12 records
  carries `capabilityOverrides.owner_name` and `owner_mailing_address` as
  `available` with a `statute` basis whose `note` says so, cites both statutes
  and names the address where a Safe at Home participant can send written
  notice, and says that judges and participants who send written notice have
  their parcel withheld from every UrbanKit surface. (The hosted API and MCP
  now serve a row with a county redaction marker in its owner, mailing or situs
  value as owner, mailing and situs null with `withheld: "county-redacted"`,
  keeping only the request fields and the parcel id; the package ships only the
  registry. A row withheld on written notice, `withheld: "notice-suppressed"`,
  is not charged; on `radius_owners` / `POST /api/atlas/radius`, which bill per
  row that carries an owner or mailing address, a county-redacted row is not
  charged either.) Read it with `reviewedCapability(county, "owner_name")`. These
  counties are `available`, not `restricted`.
- **Franklin** publishes a 2019 snapshot (its newest `Year` is 2019); its
  record carries a `dataVintage` advisory that says so.
- **Simpson**'s layer states "Data is not to be used for legal purposes"; the
  `notes` quote it. Its mailing street is `Address__1` (`Address_Li` is a
  second line used on 66 rows).
- **Meade**'s service name ends in `_WFL1`, and that suffix is required.
- In the Shelby, Franklin, McCracken, Webster, Henry, Montgomery, Meade and
  Simpson layers the plain `City`, `State` and `Zip` columns are the OWNER'S
  mailing city, state and ZIP, not the situs; the labels say so.

### New counties — Kentucky, parcel shapes only (4)

Jefferson (21111, LOJIC's open-data layer), Madison (21151), Oldham (21185)
and Henderson (21101). Their layers carry a parcel id and geometry (Henderson
also a situs address) and no owner column, so each records `owner_name` as
`not_published` on an `endpoint_schema` basis. Jefferson's record uses LOJIC's
current layer rather than Louisville Metro's `New_AllParcels`, which has an
address and a property class but was last edited in 2017.

## 0.6.21 — 2026-10-08

Three demanded counties, no API change, no breaking change. `totals` move to
**257 counties / 268 endpoints** (250 with a verified endpoint).

### New counties

- **Lyon NV (32019)**, with a verified endpoint on the county's own ArcGIS
  Server (`Landbase/Land_Use_Parcel`, MapServer layer 10 `Land Use -- Parcel`,
  35,343 parcels, owner on 99.5% of them, CORS echoes the caller's origin).
  Owner (`PANAME`), situs (`PHY_ADDR`), mailing address (`PMADD1`/`PMADD2`/
  `PMCTST`/`PZIP`) and the dashed `APN` are all on the layer. The owner column
  has no index: a `%SMITH%` search takes 13 to 15 seconds and an anchored
  `SMITH%` search about 4.5, which the `notes` record.
- **Humboldt CA (06023)**, with a verified endpoint on the county's own ArcGIS
  Server (`Parcels/Parcels`, MapServer layer 0, 72,721 parcels). The layer is
  parcels only: it publishes the APN, situs address, zoning, general plan and
  use code, but no owner or mailing columns, and the `notes` say so.
- **Fresno CA (06019)**, parcels only, with a verified endpoint on the county's
  own ArcGIS Server (`FC_PARCEL_SELECT`, MapServer layer 0, 442,045 rows). The
  county states it cannot provide ownership information on the internet under
  Cal. Gov. Code 6254.21 (now 7928.205), so the record carries an
  `ownerFieldNote` and `capabilityOverrides` marking `owner_name` and `owner_mailing_address`
  `restricted` (`county_cited_statute`, attributed to the County of Fresno), and
  neither column is in `searchFields`. `reviewedCapability` and
  `isReviewedUnservable` report both restricted. The APN, situs address, land
  use and assessed values are searchable.

## 0.6.20 — 2026-10-08

New counties, no API change, no breaking change. `totals` move to **254
counties / 265 endpoints** (247 with a verified endpoint).

### New counties

- **Chesterfield VA (51041)**, with a verified endpoint on the county's own
  ArcGIS Online organisation (`Cadastral_ProdA`, layer 3 `ParcelsEnriched`,
  150,624 parcels, edited daily, CORS `*`). The county's older Hub `Parcels`
  layer is deprecated and frozen at 2024-07-30; the record does not use it.
- **Newport News VA (51700)**, an independent city, with a verified endpoint on
  the city's `Operational/Parcel` MapServer (54,444 parcels). The layer
  publishes no edit date, which the `notes` say.
- **Bradford PA (42015)**, with a verified endpoint on PASDA's
  `BradfordCounty` MapServer layer 5 (34,935 parcels, county-supplied data).
  The owner field is truncated at 25 characters, the address columns are the
  owner's mailing address, and the layer carries no situs address; the `notes`
  say so.
- **Montgomery NC (37123)**, with a verified endpoint on the NC OneMap
  statewide parcel layer, scoped by `scopeWhere` to
  `cntyname = 'Montgomery'` (30,283 parcels).
- **Dutchess NY (36027)**, registered with `hasPublicRest: false`: the county's
  parcel layer carries geometry and ids only, the New York State tax parcel
  service has no Dutchess rows, and owner data is sold by the county's Real
  Property Tax Service Agency. The `notes` record the evidence and the contact.

## 0.6.19 — 2026-10-06

New county, no API change, no breaking change. `totals` move to **249
counties / 261 endpoints** (243 with a verified endpoint).

### New county — Polk OR (41053)

Asked for through the site's free tools on 2026-10-04. The county's
Hub-advertised REST path (`maps.co.polk.or.us/gis/`) has returned HTTP 500 on
every request since at least 2026-10-05, but the same ArcGIS Server answers on
its second web adaptor, `/arcserv2/`, and the record registers its
`Klop_core/Acct_35` taxlot layer: 36,413 taxlots with the assessment account
joined on, so owner name, owner mailing address, situs, Map Taxlot, ORTaxlot and
account number are all searchable, and the layer answers cross-origin
requests (`corsEnabled: true`), so browser clients query it directly. The
`notes` record the outage and the adaptor it works around.

## 0.6.18 — 2026-10-06

New county, no API change, no breaking change. `totals` move to **248
counties / 260 endpoints** (242 with a verified endpoint).

### New county — Mendocino CA (06045)

The County's own ArcGIS Online organisation (Mendocino County GIS) publishes a
county-wide assessor parcel layer, `Parcels_Public_` FeatureServer layer 0:
62,051 parcels, data last edited 2026-06-08, CORS open. APN (8-character text),
the 10-character APNFULL and the situs address are searchable. The layer
publishes no owner name and no owner mailing address, so the record carries an
`ownerFieldNote` and `not_published` capability overrides for both, and an
owner search returns nothing for this county. The City of Ukiah's organisation
hosts two Ukiah-area clips of the same data; neither is county-wide, so neither
is listed. `addedAt` is 2026-10-06.

## 0.6.17 — 2026-10-05

New county, one new optional field, no breaking change. `totals` move to **247
counties / 259 endpoints** (241 with a verified endpoint).

### New county — Schenectady NY (36093)

Asked for through the site's free tools on 2026-10-04 and not in the NYS Tax
Parcels Public statewide layer (a count on `COUNTY_NAME='Schenectady'` returns
0 where the Albany control returns 112,804). The record registers the public
hosted layer published by Spatial Data Logic, the vendor behind the county's
property system: 59,235 parcels, owner names published, parcel id (tax-map
print key), situs and owner mailing address. It carries a `dataVintage`
advisory, because the layer's data was last edited on 2023-09-28.

### New field — `addedAt`

A county may now carry `addedAt` (`YYYY-MM-DD`), the date it entered the
atlas. It is optional (counties added before this release carry none) and,
unlike `lastVerified`, it never moves. Schenectady is the first record to carry
it.

### Re-checked, still no public REST — Iron MI (26071), Garfield OK (40047)

Both were asked for and both stay `hasPublicRest: false`; their `notes` now
record the 2026-10-05 re-check (Michigan's state ArcGIS server lists no parcel
layer; Garfield's Spatialest GeoServer still has WFS disabled, and Oklahoma has
no statewide parcel service).

## 0.6.16 — 2026-10-04

Data refresh. No API change. `totals` unchanged at **246 counties / 258
endpoints**. Five New Jersey county records on the two NJOGIS statewide
services now state what those services serve. All 67 Florida registrations
on the FDOR statewide cadastral replace a `sampleQuery` the layer rejects
with one scoped to the county. The site's downloadable directory now scopes its sample queries,
which is not part of this package.

### Data refresh — Bergen NJ lists the mailing-address columns its shared layer serves

- **New Jersey:** Bergen County (FIPS 34003) sits on the NJ Office of GIS
  statewide composite, `Parcels_Composite_NJ_WM` FeatureServer layer 0, scoped
  `COUNTY='BERGEN'`. Essex County uses the same layer, and Essex's record
  already listed the mailing address on the tax record. Bergen's did not, so
  it understated what the layer returns. Measured live 2026-10-04, with
  Essex as the control:

  | `COUNTY=` scope, test | BERGEN | ESSEX |
  |---|---|---|
  | all rows | 281,646 | 178,089 |
  | `ST_ADDRESS<>''` | 281,646 | 178,089 |
  | `CITY_STATE<>''` | 281,646 | 178,089 |
  | `ZIP_CODE<>''` | 281,612 | 178,088 |
  | `OWNER_NAME<>''` | 0 | 0 |
  | `PROP_LOC<>''` | 281,646 | 178,089 |
  | `CALC_ACRE>0` | 244,163 | 152,381 |
  | `YR_CONSTR>0` | 263,852 | 156,919 |
  | `BLDG_DESC<>''` | 241,129 | 121,070 |

  `OWNER_NAME IS NOT NULL` returns every row in both counties, because the
  column holds empty strings. Test it with `<>''`.
- **`searchFields`:** adds `ST_ADDRESS` ("Mailing Street Address",
  searchable), `CITY_STATE` ("Mailing City and State") and `ZIP_CODE`
  ("Mailing ZIP Code"), worded exactly as Essex words them. Adds `CALC_ACRE`
  ("Calculated Acreage"). **Removes `OWNER_NAME`**, as Essex does: it is
  blank on every row statewide, and the owner-field classifier takes the first
  owner-looking column, so listing it pointed owner lookups at a blank
  column. The column's absence of data stays on record through the existing
  `ownerFieldNote` and the reviewed `capabilityOverrides.owner_name`
  (`restricted`, Daniel's Law, quoted from the service description). Both are
  unchanged apart from the row count in the note.
- `sampleQuery` now returns the mailing columns. `corsEnabled` `null` →
  `true` (`Access-Control-Allow-Origin: *`). `lastVerified` 2026-05-15 →
  2026-10-04. `licenseUrl` and `contact.url` were `https://www.njogis.com/`,
  which no longer resolves (NXDOMAIN). They now point to the layer's ArcGIS
  item and to NJGIN, as Essex's do. `notes` rewritten to the measured facts.
  The old notes claimed "20,553+ parcels", and the scope holds 281,646.
- **What a consumer sees:** the site's derived capability for
  `owner_mailing_address` on Bergen moves from `not_published` to
  `available`, the same as Essex. Owner-name search stays unavailable.
- **Essex** (FIPS 34013) now lists `YR_CONSTR` ("Year of Construction") and
  `BLDG_DESC` ("Building Description") with Bergen's labels. Both are
  populated for Essex: 156,919 and 121,070 of 178,089 rows. With that change
  Bergen and Essex list the same composite columns. `lastVerified` is now
  2026-10-04 and `notes` carry the two counts.
- **Ocean (34029), Camden (34007) and Morris (34027)** stay on their own
  service, `maps.nj.gov` `Framework/Cadastral/MapServer/0`. It publishes the
  same 3,481,240 statewide rows as the composite, and its Essex counts match
  the composite's exactly. Measured on that service 2026-10-04:

  | `COUNTY=` scope, test | OCEAN | CAMDEN | MORRIS | ESSEX (control) |
  |---|---|---|---|---|
  | all rows | 299,346 | 191,292 | 177,533 | 178,089 |
  | `ST_ADDRESS<>''` | 299,346 | 191,292 | 177,533 | 178,089 |
  | `CITY_STATE<>''` | 299,346 | 191,292 | 177,531 | 178,089 |
  | `ZIP_CODE<>''` | 299,327 | 191,292 | 177,514 | 178,088 |
  | `PROP_LOC<>''` | 299,346 | 191,292 | 177,531 | 178,089 |
  | `OWNER_NAME<>''` | 0 | 0 | 0 | 0 |
  | `CALC_ACRE>0` | 260,309 | 169,212 | 166,312 | 152,381 |
  | `YR_CONSTR>0` | 258,549 | 162,106 | 156,490 | 156,919 |
  | `BLDG_DESC<>''` | 260,928 | 153,496 | 146,953 | 121,070 |

  For each of the three:
  - **`OWNER_NAME` is removed** from `searchFields`. It was listed as
    searchable, and Ocean's notes called it "public, queryable".
  - **Fields added:** `ST_ADDRESS`, `CITY_STATE` and `ZIP_CODE` with Essex's
    labels. `CALC_ACRE`, `YR_CONSTR` and `BLDG_DESC` are listed with Bergen's
    labels.
  - **`PAMS_PIN` relabelled** "PAMS Parcel Identifier (MUN_BLOCK_LOT)". The old
    label, "PAMS Property Identification Number", did not match the site's
    parcel-id reader, so `apn` derived as `not_published`. It now derives as
    `available`, and so does `owner_mailing_address`.
  - **`capabilityOverrides.owner_name` stays `not_published`**, with its
    `endpoint_schema` basis. This service states no reason for the blank
    column. The Daniel's Law attribution comes from the composite service's
    description, so `ownerFieldNote` and `notes` quote it as that service's
    statement. They do not record it as a restriction this endpoint cites.
  - **Other changes:** `notes` and `ownerFieldNote` are rewritten from the
    measured counts. Camden's layer carries 36 municipality names. Its old
    notes said 37 municipalities. Unverified population figures and clerk links
    are dropped, including oceanrecorder.com, which no longer resolves.
  - `corsEnabled` `null` → `true`, because the service reflects the request
    origin. `sampleQuery` is now a `PROP_LOC` search that returns the mailing
    columns. The old one searched the blank owner column and returned nothing.
    `lastVerified` 2026-05-15 → 2026-10-04.
- **Bergen and Essex** `capabilityOverrides.owner_name.basis.sourceUrl` and
  `ownerFieldNote.source.url` move from `https://www.nj.gov/njgin/`, which
  does not carry the Daniel's Law statement, to the composite's ArcGIS item,
  `https://www.arcgis.com/home/item.html?id=533599bbfbaa4748bf39faf1375a8a9c`.
  Its summary reads "The OWNER_NAME field is redacted per Daniel's Law for
  public web access." Essex's `notes` and `ownerFieldNote` are dated
  2026-10-04, matching its `lastVerified`. The counts are unchanged: 178,089
  rows, 0 with an owner name, 3,481,240 statewide, all re-measured 2026-10-04.

### Data fix — Florida FDOR sample queries use a capped scoped `where`

- **Florida:** 57 county records use the Florida Department of Revenue
  statewide cadastral (`Florida_Statewide_Cadastral` FeatureServer layer 0)
  as their first endpoint. Their `sampleQuery` was a point+distance query.
  On 2026-10-04 the layer rejects every distance-buffered query with HTTP 200
  and error 400 "24204: The spatial reference identifier (SRID) is not
  valid", whether the point is sent in wkid 4326 or 3857, so the sample
  returned nothing. Each record's `sampleQuery` is now
  `where=(CO_NO=<n>)&outFields=*&resultRecordCount=1`. That is the record's
  own `scopeWhere`, composed the way the site's directory composes it. Fired
  live 2026-10-04: all 57 answered HTTP 200 with one row carrying that
  county's own `CO_NO`, median about 1 second, slowest under 10 seconds.
  Without the cap the layer returns its 2,000-row maximum. No `scopeWhere`,
  URL, field list or note changed.
- The 10 Florida records that register FDOR as a **second** endpoint, after
  their own county layer, get the same sample. Fired live 2026-10-04:
  Duval, Manatee, Sarasota, Pinellas and Pasco answered one row with their
  own `CO_NO` in about half a second. Broward answered after 55 seconds cold
  and in 50 ms once warm. Miami-Dade, Hillsborough, Palm Beach and Lee did
  not answer it: about 55 seconds each, then HTTP 200 with error 400 "Unable
  to perform query", twice each. On those large counties the layer also
  fails a cap of 101 or 501, except Hillsborough, which answers both. That
  matches the slow-scan limit the Florida notes describe, because the layer
  does not index `CO_NO`. The old point+distance sample failed on all ten.

## 0.6.15 — 2026-10-03

SDK change, no data change. `totals` stay at **246 counties / 258
endpoints**. This release lets an agent tell which layers take a typed search,
and fixes the deep-link helper, which sent people to a search that cannot run
(GitHub #905). One existing output changes; see "Changed".

68 endpoints carry `attributeSearch: "unsupported"`: the 67 Florida counties on
the shared FDOR cadastral layer, whose county column is not indexed, and
Orleans Parish LA, whose server never finishes a table scan. Those layers
answer spatial queries and return owner, address and parcel fields on every
hit. They do not answer a `where` clause. Until now the package exposed the
flag but no reader for it, and `buildParcelLookupDeepLink` ignored it.

### Added

- **`offersAttributeSearch(endpoint)`**: false when the layer refuses a
  `where` clause. Query such a layer by geometry, as its `sampleQuery` shows.
  It gives the same answer as the reader urbankitstudio.com uses, on every
  bundled endpoint; a monorepo test holds the two equal.
- **`countyOffersAttributeSearch(county)`**: true when ANY of the county's
  layers takes a `where` clause. Miami-Dade answers true through its own layer
  although its FDOR layer is flagged.
- **`buildParcelLookupDeepLink(endpoint, base?, county?)`**: an optional third
  argument, the `CountyRecord` (or any `{ stateSlug, countySlug, endpoints? }`,
  exported as the `DeepLinkCounty` type). When given, the county's PRIMARY
  layer (`endpoints[0]`) links to the county route
  `/tools/parcel-lookup/<state>/<county>` if it is flagged or shared
  (`scopeWhere` set). Only that route knows the county, so only it can scope a
  shared layer and show a flagged one as lookup by location. It always loads
  the primary layer, so any other endpoint keeps the generic `?endpoint=` link
  to itself: Broward's flagged FDOR layer sits behind the county's own layer,
  as it does in nine other Florida counties. Passed without `endpoints`, the
  county is taken as vouching that the endpoint is its primary.
- **`canonicalLayerUrl(url)`**: one key per layer, used for that comparison.
  An http(s) URL keys on host and path, with the scheme, a default port, the
  query string, the fragment, a trailing `/query`, repeated slashes, dot
  segments, trailing slashes and letter case folded away. urbankitstudio.com
  keys its own registry lookup the same way.

### Changed — existing output, as a bug fix

- `buildParcelLookupDeepLink` no longer adds `fieldHint` for a flagged layer,
  with or without the new argument. This changes what an existing call
  returns: Orleans Parish lost `fieldHint=OWNERNME1`, which pre-selected an
  owner search that never answers. The FDOR layers had no `fieldHint` before.
  Calls on unflagged layers return exactly what they returned in 0.6.14. It
  ships as a patch because the old link opened a search that never answers,
  and before 1.0 a bug fix that changes a returned string is still a patch.
- The `attributeSearch` doc comment counted 67 flagged registrations. It now
  says 68 and names Orleans Parish.
- The README's deep-link example showed `fieldHint=TaxName` for Kane County.
  The helper never produced that, because `TaxName` does not match its owner
  rule. The example now shows the real output.

## 0.6.14 — 2026-10-03

Data refresh. No API change. `totals` move from **241 counties / 253
endpoints** to **246 counties / 258 endpoints**; 240 of the 246 now carry a
verified endpoint (was 235 of 241). Five endpoints are added: four new counties
and Clackamas OR, which was already on record without one. Garfield OK is
added without an endpoint. Only Sullivan TN adds an owner-name search. The
other four endpoints answer by parcel number and, except Tulare, by address,
and each records why owner data is absent in `capabilityOverrides` and
`ownerFieldNote`.

### Data refresh — five endpoints, one county without one

- **New Jersey:** Essex County (FIPS 34013, Newark), on the NJ Office of GIS
  statewide Parcels and MOD-IV composite (`Parcels_Composite_NJ_WM`, layer 0),
  scoped `COUNTY='ESSEX'` (178,089 of 3,481,240 rows). Searchable by PAMS
  parcel identifier (`PAMS_PIN`), property location (`PROP_LOC`),
  municipality (`MUN_NAME`) and the mailing street on the tax record
  (`ST_ADDRESS`). **Not searchable by owner:** `OWNER_NAME` is an empty string
  on every row statewide, and the NJ Office of GIS states in the service
  description that it is redacted per Daniel's Law for public web access, so
  the column is not listed and `owner_name` is `restricted`, attributed to
  NJOGIS, as for Bergen. Licence: public. Because the composite is now shared,
  Bergen's registration gains the matching `scopeWhere` `COUNTY='BERGEN'`.
- **Oregon:** Clackamas County (FIPS 41005, Oregon City), already on record
  without an endpoint, now carries the county's `Taxlots_CMap` FeatureServer,
  layer 0 (163,927 taxlots). Searchable by parcel number (`PARCEL_NUMBER`),
  map and taxlot (`TLNO`), site address (`SITUS`) and city (`SITUS_CITY`).
  **Not searchable by owner and no mailing address:** the layer has neither
  column and the county publishes owner names on no public layer, routing owner
  questions to Assessment and Taxation; `owner_name` and
  `owner_mailing_address` are `not_published`. No scope (county layer).
  Licence: disclaimer only, recorded `unknown`.
- **Nebraska:** Phelps County (FIPS 31137, Holdrege), on Nebraska's statewide
  `StatewideParcelsExternal` MapServer, layer 0, scoped `County_ID='137'`
  (7,664 of 1,154,898 rows; 59 are blank-attribute polygons, which the
  sample query skips with `Parcel_ID<>''`). Searchable by parcel ID (`Parcel_ID`,
  `State_PID`), situs address (`Situs_Address`) and legal description.
  **Not searchable by owner and no mailing address:** the statewide layer has
  neither column, and the county's gWorks vendor server exposes only a parcel
  key; `owner_name` and `owner_mailing_address` are `not_published`. CORS
  reflects the request origin. Licence: none stated, recorded `unknown`.
- **California:** Tulare County (FIPS 06107, Visalia), on the county's
  `Parcels_(Public_View)` FeatureServer, layer 0 (166,875 parcels).
  Searchable by APN only (`APN`, nine-digit text, and `APNFormatted`) plus
  legal description. **No owner, no site address, no mailing address** in the
  layer; `owner_name`, `owner_mailing_address` and `situs_address` are
  `not_published`. `maxRecordCount` is 1000. No scope (county layer). Not the
  City of Tulare's layer at maps.tulare.ca.gov. Licence: none stated, recorded
  `unknown`.
- **Tennessee:** Sullivan County (FIPS 47163, Blountville), on the City of
  Johnson City's regional `ParcelPublishing/TaxParcels` MapServer, layer 0,
  scoped `COUNTYNAME='Sullivan County'` (78,958 of 183,538 rows; the bare value
  `Sullivan` matches nothing). Searchable by owner name (`OWNER`), parcel ID
  (`GISLINK`, `ID`), property address (`ADDRESS`, stored street first and house
  number last) and owner mailing address (`MAILADDR`). CORS reflects the
  request origin. **Licence: `restricted`.** The item's terms say delivered
  products "are not to be resold by the purchaser for any reason and may not be
  reproduced without the written permission of the staff of the Johnson City
  GIS Division"; the record holds only the query URL and the county is served
  by live query.
- **Oklahoma:** Garfield County (FIPS 40047, Enid), **no endpoint**
  (`hasPublicRest: false`). The assessor's Spatialest viewer is backed by a
  GeoServer that serves WMS images only with WFS disabled, and Oklahoma has no
  statewide parcel REST layer. The `notes` record the search, with controls, so
  it is not repeated.

All six states were already registered in `POPULATED_STATES`, so `src/*.ts`
is unchanged and only `data/` grew. Deliberately a **patch**, for the reason
0.6.5 gave: adding county rows to an already-registered state is the 0.6.1
shape, and `^0.6.0` reaches everyone already installed.

## 0.6.13 — 2026-10-03

Data refresh. No API change. `totals` unchanged at **241 counties / 253
endpoints**; one county moves from `unreachable` to `live`.

### Data refresh — Orleans Parish LA is live again, for location queries

- **Louisiana:** Orleans Parish (FIPS 22071, New Orleans), `apps/property3`
  MapServer layer 15, `status` **`unreachable` → `live`**, `lastVerified`
  2026-10-03. The layer was never down: it refuses any query that names its
  `outFields` (every named list answers HTTP 200 carrying ArcGIS error 400
  "Failed to execute query." in about 0.2 s) and never finishes a table scan
  (`1=1`, `OBJECTID>0` and `PARCELID IS NOT NULL` all ran past 40 s for a
  single row), which is the shape the old sample query and 463 consecutive
  probes used. With `outFields=*` the same layer answers a point + 30 m query
  in 0.28 s (40 features) and an 800 m envelope with geometry in 0.65 s (501
  features). The record now carries **`attributeSearch: "unsupported"`**: no
  `where`-clause search is offered, so a consumer that reads the flag offers
  lookup by location only. The owner columns (`OWNERNME1`, `OWNERNME2`) and the
  mailing address (`PSTLADDRESS`, `PSTLCITY`, `PSTLSTATE`, `PSTLZIP5`) are
  returned on every spatial hit. `sampleQuery` is an exact `PARCELID`
  equality with `outFields=*`, the one predicate shape that answers quickly.
  `corsEnabled` `null` → `true` (the header reflects the request origin).
  `notes` rewritten to the measured facts. Consumers that name their columns
  must send `*` to this layer; the site does so through its wildcard list.
  **TLS caveat, stated in `notes`:** the server sends an incomplete
  certificate chain (leaf without its Sectigo intermediate). Clients that
  fetch the missing intermediate themselves (curl on Windows, Chromium and
  Safari through the OS store) connect; Node's `fetch` fails the handshake
  with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (measured 2026-10-04). UrbanKit's
  billed enrichment and radius paths run on Vercel's Edge runtime, which
  cannot be given a certificate authority and whose handling of an incomplete
  chain is undocumented and not yet measured, so assume they cannot serve this
  parish until a keyed test on the deployed function says otherwise; today an
  Orleans row ends `county-unavailable` and is refunded, unchanged from
  before. The liveness probe pins the intermediate, so its ok describes the
  layer, not those paths. A Node consumer of this record must trust the
  Sectigo intermediate before any query runs. Tracked in urbankitstudio#906.
  **Field order:** `PARID` (the assessor's per-unit parcel id) is listed first
  and `PARCELID` (the GeoPIN, a lot id shared by every condo unit on a lot)
  second, so a consumer that keys rows by the first parcel-id field keys by
  unit: a 30 m buffer in the CBD returns 40 units on 3 lots with 39 owners.

## 0.6.12 — 2026-10-03

Data refresh. No API change. `totals` move from **239 counties / 251
endpoints** to **241 counties / 253 endpoints**; 235 of the 241 now carry a
verified endpoint (was 233 of 239).

### Data refresh — two counties added

- **Minnesota:** Mille Lacs County (FIPS 27095, Milaca), with a verified
  endpoint on the county's own `MilleLacs_Public_101` MapServer, layer 35
  (20,083 parcels with a taxpayer name). Searchable by taxpayer name
  (`TAXPAYER_NAME`, stored `LAST/FIRST`, e.g. `SMITH/BRIAN & ASHLEY`), parcel
  number (`PARCELID`), site address (`PROPERTY_ADDRESS`, `CITY_TWP_NAME`) and
  the taxpayer mailing address (`TAXPAYER_ADDRESS_1` to `_4`). The layer also
  has an `OWNER_NAME` column, but it is blank on about 97 percent of rows and
  names a different party where it is filled, so it is deliberately not listed
  and owner search uses `TAXPAYER_NAME`. CORS
  reflects the request origin. No license is stated.
- **Missouri:** the independent City of St. Louis (FIPS 29510, no county; not
  St. Louis County, 29189), with a verified endpoint on the Assessor's
  `Assessor_Public_Parcels` MapServer, layer 11. Searchable by owner name
  (`OwnerName`, truncated to 40 characters at the source), parcel id
  (`ParcelId`), site address (`SITEADDR`, which carries runs of internal
  spaces, so search on a house number plus a street word) and the owner
  mailing address (`OwnerAddr`, `OwnerCity`). **The server sends no
  `Access-Control-Allow-Origin` header, so `corsEnabled` is `false`:** a
  browser on another origin cannot read it, and it must be queried from a
  server. No license is stated.

Minnesota and Missouri were already registered in `POPULATED_STATES`, so
`src/*.ts` is unchanged and only `data/` grew. Deliberately a **patch**, for
the reason 0.6.5 gave: adding county rows to an already-registered state is
the 0.6.1 shape, and `^0.6.0` reaches everyone already installed.

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
