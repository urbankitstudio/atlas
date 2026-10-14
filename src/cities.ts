// City datasets: code violations, building permits and zoning cases for the
// cities UrbanKit has verified, and the exact query the site sends for each.
//
// Two halves. Between the CORE-COPY markers is a verbatim copy of the
// monorepo's src/lib/city-query-core.ts (the package cannot import from src/),
// written by scripts/sync-city-core.mjs and pinned identical by the monorepo's
// atlas-package-city-parity test. Below the markers is this package's public
// API over the bundled registries in cities-data.ts. Nothing here fetches.

import type {
  CityPropertyRecord as CityProperty,
  CityPropertyIndexEntry,
  DatasetKind,
  PropertyDataset,
  PropertyFieldMap,
  PropertyStatusBuckets,
} from "./city-types.js";
import type {
  CasesSource,
  CityZoningIndexEntry as CityIndexEntry,
  CityZoningRecord as CityZoning,
  CurrentZoningSource,
  ZoningStatusBuckets,
} from "./city-types.js";
import { PROPERTY_CITIES, ZONING_CITIES, cityPropertyIndex, cityZoningIndex } from "./cities-data.js";

// CORE-COPY-BEGIN (written by scripts/sync-city-core.mjs from src/lib/city-query-core.ts; do not edit here)

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

/** Rows per upstream request, the same on every provider and every tool. */
export const CITY_RECORD_LIMIT = 30;

/**
 * SoQL / ArcGIS / Postgres-SQL literal escape: double single-quotes. The search
 * value only ever lands inside a quoted LIKE literal, so escaping the quote is
 * the injection guard. (Postgres standard-conforming strings treat backslash
 * literally, so the doubled single-quote is the escape CKAN and CARTO need too.)
 */
export function esc(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * The ceiling on a dataset's houseNumberSpaceRuns (the registry validator
 * enforces the same number): eight alternatives is already a long OR group.
 */
export const HOUSE_GAP_LIMIT = 8;

/**
 * The most URL-encoded bytes one ORed LIKE group may take (about 3,000). A
 * 120-character non-ASCII street encodes to nine bytes a character, which times
 * the alternatives would push a query URL toward the limits of the upstream
 * servers and proxies; past this the group falls back to the single literal.
 * The registry-fixed rest of the clause (the scope filter, the status list) is
 * not counted: it is a few hundred bytes on every dataset.
 */
export const LIKE_GROUP_BUDGET = 3000;

/** A leading house number (digits, then a glued unit or a range: "1422A", "1252-1270") and the whitespace after it. */
const HOUSE_AND_GAP = /^(\s*(?:\d[A-Za-z0-9]*|\d+-[A-Za-z0-9]+))\s+(?=\S)/;

/**
 * The LIKE pattern bodies (between the outer %...%) that match a typed street.
 * By default one: the typed text, quotes escaped as in esc(). A dataset opts in
 * with houseNumberSpaceRuns (maxRun here) only when its table was MEASURED to
 * store a run of spaces after the house number: Orlando code cases carry two
 * ("4274  TATUM ST  ORLANDO FL", 99,433 of 146,669), permits two or three
 * (55,657 of 1,105,323), zoning cases two or three (221 of 407), so a typed
 * '4274 Tatum St' as one literal found nothing. Every other dataset keeps the
 * single literal, because the OR group is a heavier query for no gain
 * (measured 1.6 to 1.9x on Chicago violations and Orlando permits).
 *
 * When maxRun >= 1 and the street starts with a house number, the bodies are the
 * typed text with 1 to maxRun spaces in that one gap, plus the typed text itself
 * when it is not among them (a five-space or tab address still finds its own
 * query), and the caller ORs them: spaces only, so '4274 Tatum St' does not
 * match '4274 OLD TATUM ST' and '12 Main' does not match '12 Old Main'. A
 * wildcard in the gap ('4274 %Tatum') measured as exactly that false positive.
 * The number is still not anchored on its left, as before: '12 Main' also
 * matches '3312 MAIN'. An ordinal street first ("88th St") is no house number,
 * and so is anything with nothing after the gap ("1 "). The pattern is linear in
 * the input (no nested quantifier).
 */
export function likeAlternatives(s: string, maxRun = 0): string[] {
  const typed = esc(s);
  const runs = Math.min(Math.floor(maxRun), HOUSE_GAP_LIMIT);
  if (!(runs >= 1)) return [typed];
  const m = HOUSE_AND_GAP.exec(s);
  if (!m || ORDINAL_STREET.test(m[1].trim())) return [typed];
  const house = esc(m[1]);
  const rest = esc(s.slice(m[0].length));
  const out = Array.from({ length: runs }, (_, i) => `${house}${" ".repeat(i + 1)}${rest}`);
  return out.includes(typed) ? out : [...out, typed];
}

/**
 * One LIKE clause per alternative, ORed and parenthesised when there are several,
 * so the AND clauses around it keep their scope. A group whose encoded length
 * passes LIKE_GROUP_BUDGET falls back to the single typed literal.
 */
function likeAny(street: string, one: (body: string) => string, maxRun: number | undefined): string {
  const parts = likeAlternatives(street, maxRun).map(one);
  if (parts.length < 2) return parts[0];
  const group = `(${parts.join(" OR ")})`;
  return encodeURIComponent(group).length > LIKE_GROUP_BUDGET ? one(esc(street)) : group;
}

/**
 * CKAN / CARTO SQL identifier quote: wrap in double-quotes and double any
 * embedded double-quote. Column and resource names come from the registry, not
 * from input; quoting lets columns with spaces or symbols ("PERMIT #") be
 * referenced safely.
 */
export function sqlId(id: string): string {
  return `"${id.replace(/"/g, '""')}"`;
}

// ---------------------------------------------------------------------------
// Split addresses (a table that keeps the street number in its own column)
// ---------------------------------------------------------------------------

const DIRECTIONALS = new Set([
  "N", "S", "E", "W", "NE", "NW", "SE", "SW",
  "NORTH", "SOUTH", "EAST", "WEST", "NORTHEAST", "NORTHWEST", "SOUTHEAST", "SOUTHWEST",
]);

/** The spelled-out directions: a street NAMED South ('South Blvd', 'North Ave') as opposed to the abbreviation in 'N St'. */
const FULL_DIRECTIONS = new Set(["NORTH", "SOUTH", "EAST", "WEST"]);

const STREET_SUFFIXES = new Set([
  "ST", "STREET", "AVE", "AV", "AVENUE", "BLVD", "BOULEVARD", "RD", "ROAD", "DR", "DRIVE",
  "LN", "LANE", "CT", "COURT", "PL", "PLACE", "WAY", "PKWY", "PARKWAY", "HWY", "HIGHWAY",
  "CIR", "CIRCLE", "TER", "TERRACE", "TRL", "TRAIL", "PK", "PIKE", "SQ", "SQUARE", "PLZ", "PLAZA",
  "ALY", "ALLEY", "RW", "ROW", "LOOP", "RUN", "PATH", "WALK", "CV", "COVE",
  "EXPY", "EXPRESSWAY", "FWY", "FREEWAY",
]);

/**
 * An ordinal street name ("88th", "3rd"). It is digits plus letters, so it reads
 * as a house number with a glued unit ("1422A"); typed first, it is the street.
 */
const ORDINAL_STREET = /^\d+(?:ST|ND|RD|TH)$/i;

export interface SplitStreet {
  /** Digits only. */
  number: string;
  /** The street name with a leading directional and a trailing suffix removed. */
  name: string;
}

/**
 * "1422 N Western Ave" -> { number: "1422", name: "Western" }. Null when the
 * typed street carries no leading house number, which makes the caller fall
 * back to the plain substring match. A unit glued to the number ("1422A",
 * "1422-B") is dropped; the name keeps at least one token. A first token that
 * is an ordinal street name ("88th St", "3rd Ave") is no house number.
 */
export function splitStreet(street: string): SplitStreet | null {
  // The number and a glued unit are matched alone; the whitespace after them is
  // skipped by hand. One regex ending in \s+(.+)$ is quadratic on '1' + spaces + '\n'.
  const m = /^\s*(\d+)(?!\d)(?:-[A-Za-z0-9]+|[A-Za-z0-9]+)?/.exec(street);
  if (!m || !/\s/.test(street.charAt(m[0].length)) || ORDINAL_STREET.test(street.trim().split(/\s+/)[0])) return null;
  let at = m[0].length;
  while (at < street.length && /\s/.test(street.charAt(at))) at++;
  const rest = street.slice(at);
  if (!rest || /[\n\r\u2028\u2029]/.test(rest)) return null;
  const name = bareName(rest.trim().split(/\s+/).filter(Boolean));
  if (!name) return null;
  return { number: m[1], name };
}

/** One leading directional and one trailing street type off a token list; the name keeps at least one token. */
function bareName(tokens: string[]): string {
  if (tokens.length > 1 && DIRECTIONALS.has(tokens[0].toUpperCase())) tokens = tokens.slice(1);
  if (tokens.length > 1 && STREET_SUFFIXES.has(tokens[tokens.length - 1].replace(/\.$/, "").toUpperCase())) {
    tokens = tokens.slice(0, -1);
  }
  return tokens.join(" ").trim();
}

/** The column roles of a streetNumber dataset that lists no addressParts: number, direction, name, type. */
const NUMBERED_PARTS = ["number", "direction", "name", "type"] as const;

const DIRECTION_LETTERS = new Set(["N", "S", "E", "W"]);
const PLAIN_STREET_TYPES = new Set(["ST", "STREET", "AVE", "AVENUE"]);

/**
 * The lone letter or digit of a lettered street typed with a house number:
 * '1700 E Q St' is the street Q, '100 N A St' is A, '100 E St' is E. The type
 * word is what says the single character is a street and not a stray token
 * ('100 E', '100 Q' have no type and are no split). One optional leading
 * directional may sit before the character; anything else is not this shape.
 * With no explicit directional, a character that is itself a direction letter
 * (N S E W) counts only before St, Street, Ave or Avenue: '100 N Court' and
 * '100 E Blvd' are a direction plus a street, which splitFor reads. Null otherwise, including when no
 * house number leads the typed line.
 */
function letteredStreet(street: string): string | null {
  if (!splitStreet(street)) return null;
  const rest = street.trim().split(/\s+/).slice(1);
  if (rest.length < 2 || rest.length > 3) return null;
  if (!STREET_SUFFIXES.has(rest[rest.length - 1].replace(/\.$/, "").toUpperCase())) return null;
  if (rest.length === 3 && !DIRECTIONALS.has(rest[0].toUpperCase())) return null;
  const one = rest[rest.length - 2];
  if (!/^[\p{L}\p{N}]$/u.test(one)) return null;
  // Two tokens and the character is itself a direction letter: 'N Court' and 'E Blvd' read as a
  // direction plus a street (splitFor takes the type word), so only the plainest types make it a lettered street.
  if (rest.length === 2 && DIRECTION_LETTERS.has(one.toUpperCase()) && !PLAIN_STREET_TYPES.has(rest[1].replace(/\.$/, "").toUpperCase())) return null;
  return one;
}

/**
 * Whether a property dataset searches by split address for this street. The
 * number comes from splitStreet; the NAME is what the agent path derives for the
 * same typed line (splitAddressStreetName with the number column unmapped), so
 * '2600 South Blvd' is the street South, '100 NE St' is 'NE St', and a number plus
 * one unsafe token ('100 %', '100 E', '100 St') is no split at all: the typed
 * line goes as a plain match, as the agent sends it, never a '%%%' or '%E%'
 * beside the number. A lettered street ('1700 E Q St', see letteredStreet) is the
 * one exception to the agent's name: the page has the number bound, so the lone
 * letter is a safe name beside it, where the agent (which may have no number
 * column) refuses it. The other: a direction plus one type word that is not St or
 * Ave ('100 N Court', '100 E Blvd') searches the type word, since the direction
 * has its own column.
 */
function splitFor(ds: PropertyDataset, street: string): SplitStreet | null {
  if (!ds.fields.streetNumber) return null;
  const s = splitStreet(street);
  if (!s) return null;
  const letter = letteredStreet(street);
  if (letter) return { number: s.number, name: letter };
  const name = splitAddressStreetName(ds.fields.addressParts ?? NUMBERED_PARTS, ds.fields.addressParts ? ds.fields.address : "name", undefined, street);
  if (name === street) return null;
  // The agent leaves 'N Court' / 'E Blvd' whole; these tables keep the direction in its own column and the
  // bare name ('COURT') in the name column, so the street is the type word. 'NE St' stays (a plain type).
  const words = name.split(" ");
  if (words.length === 2 && DIRECTIONALS.has(words[0].toUpperCase())) {
    const type = words[1].replace(/\.$/, "");
    if (STREET_SUFFIXES.has(type.toUpperCase()) && !PLAIN_STREET_TYPES.has(type.toUpperCase())) return { number: s.number, name: type };
  }
  return { number: s.number, name };
}

/**
 * The text a property dataset matches when the typed street carries no split
 * (no house number, or no streetNumber column). On a split-street table the
 * address column holds the bare name ("FUNTIER" with "CT" in its own column), so
 * a name typed without a number gets the same tolerance as the number + name
 * path: one leading directional and one trailing street type come off. Other
 * datasets, a street with nothing to strip, and a trim that would leave a lone
 * letter, no letter or digit at all (a typed '%' or '_'), or a direction or
 * street type word that only a leading directional exposed ('N St' would
 * become 'St', 'NE St' too), are matched as typed. A name that IS a type word
 * keeps its trim when a real type follows it: 'Court St' is the street Court.
 * A spelled-out direction with a type ('South St', 'North Ave') is the street
 * South or North: the direction stays and the type goes. A typed '%' or '_'
 * stays a live LIKE wildcard, as it always has.
 */
function plainNeedle(ds: PropertyDataset, street: string): string {
  if (!ds.fields.streetNumber) return street;
  // A typed house number whose split splitFor refused ('100 %', '100 E', '100 St'):
  // the typed line, as the agent sends it, not a trim that leaves '100' or '%'.
  if (splitStreet(street)) return street;
  const tokens = street.trim().split(/\s+/).filter(Boolean);
  const name = bareName(tokens);
  if (!name || name.split(" ").length >= tokens.length) return street;
  // A trim that leaves nothing searchable is no trim: "N St" and "E St" are the
  // streets N and E (not '%St%'), "N E St" is not '%E%', "N % St" is not '%%%'.
  if (typeWordExposed(tokens, name) && FULL_DIRECTIONS.has(tokens[0].toUpperCase()) && STREET_SUFFIXES.has(name.replace(/\.$/, "").toUpperCase())) {
    return tokens[0];
  }
  if (name.length < 2 || typeWordExposed(tokens, name) || !/[\p{L}\p{N}]/u.test(name)) return street;
  return name;
}

function isDirectionOrType(name: string): boolean {
  const u = name.replace(/\.$/, "").toUpperCase();
  return DIRECTIONALS.has(u) || STREET_SUFFIXES.has(u);
}

/**
 * Whether a trimmed name is a direction or street type word that only the
 * leading-directional strip exposed: "N St" leaves 'St', "North Ave" leaves
 * 'Ave', where the typed word sat in the type position. A type word with a real
 * type after it is a street name ("Court St" is the street Court, "N Court St"
 * too), so a trailing type that came off clears it.
 */
function typeWordExposed(tokens: string[], name: string): boolean {
  if (tokens.length < 2 || !DIRECTIONALS.has(tokens[0].toUpperCase())) return false;
  const rest = tokens.slice(1);
  const typeCameOff = rest.length > 1 && STREET_SUFFIXES.has(rest[rest.length - 1].replace(/\.$/, "").toUpperCase());
  return !typeCameOff && isDirectionOrType(name);
}

/**
 * The street NAME to match on a dataset whose table splits the address across
 * columns (`addressParts`) but maps no `streetNumber` column. Such a name
 * column holds "MARILLA" while "1500" and "ST" sit in their own columns, so the
 * typed line as one substring finds almost nothing (Dallas violations, live
 * probe 2026-10-13: '%Marilla St%' on str_nam matched 6 of 109 rows, 101 of
 * which carry the type in str_suffix; '%Marilla%' matched all 109). The site
 * page still sends the typed line (propertyQueryUrl, casesQueryUrl); the agent
 * surfaces match the derived name.
 *
 * The roles come from the column ORDER the registry already carries: the
 * display composers (PropertyReportTabs, zoning-providers) join addressParts in
 * this order, number first. The name column is `fields.address`; a column
 * before it is the house number, a second column before it is a directional,
 * a column after it is the street type. Each is taken off the typed street at
 * most once, only when its column exists: the leading house number (a glued
 * unit or range stays with it: "1422A", "1252-1270"), then one leading
 * directional (N S E W NE NW SE SW, or the full words), then one trailing
 * street type (optional period). The name keeps at least one token, so a lone
 * number or a lone type is sent as typed. A strip that leaves a lone letter, no
 * letter or digit, or a lone direction or type word with no real type after it
 * ('N St' would become 'St', '100 St' too) is not applied. When a real strip
 * came off, the typed tokens go without the house number (the name column owns
 * none): '100 N St' sends 'N St'. When only the number did, the street goes as
 * typed: '100 %' and '100 E' stay as they are, never '%' or 'E'. A type word with
 * a real type after it is a name: '100 Court St' sends 'Court'. A spelled-out
 * direction with a type on a table with a type column ('2600 South Blvd',
 * '100 North Ave') is the street South or North and sends 'South' or 'North'.
 * Unchanged when the parts give no
 * role: no parts, the name column not among them, or a mapped number column
 * (then the split clause in propertyQueryUrl owns the number).
 */
export function splitAddressStreetName(
  parts: readonly string[] | undefined,
  nameColumn: string | undefined,
  numberColumn: string | undefined,
  street: string,
): string {
  if (!parts || !nameColumn || numberColumn) return street;
  const at = parts.indexOf(nameColumn);
  if (at < 0 || parts.length < 2) return street;
  const before = at;
  const after = parts.length - 1 - at;
  let tokens = street.trim().split(/\s+/).filter(Boolean);
  const typedTokens = tokens.length;
  let dirOff = false;
  let typeOff = false;
  if (before >= 1 && tokens.length > 1 && /^\d+(?!\d)(?:-[A-Za-z0-9]+|[A-Za-z0-9]+)?$/.test(tokens[0]) && !ORDINAL_STREET.test(tokens[0])) {
    tokens = tokens.slice(1);
  }
  const afterNumber = tokens;
  if (before >= 2 && tokens.length > 1 && DIRECTIONALS.has(tokens[0].toUpperCase())) {
    tokens = tokens.slice(1);
    dirOff = true;
  }
  if (after >= 1 && tokens.length > 1 && STREET_SUFFIXES.has(tokens[tokens.length - 1].replace(/\.$/, "").toUpperCase())) {
    tokens = tokens.slice(0, -1);
    typeOff = true;
  }
  const name = tokens.join(" ");
  // South Blvd and North Ave are the streets South and North: the spelled-out
  // direction comes back and the type goes. 'N St' and 'NE St' stay rejected below.
  if (dirOff && !typeOff && after >= 1 && FULL_DIRECTIONS.has(afterNumber[0].toUpperCase()) && STREET_SUFFIXES.has(name.replace(/\.$/, "").toUpperCase())) {
    return afterNumber[0];
  }
  // Same guard as plainNeedle: a strip that leaves a lone letter, no letter or
  // digit, or a lone type/direction word nothing real follows is no strip
  // ("N St" is the street N, not '%St%'; "N % St" is not '%%%'). Past a real
  // strip the house number stays off (the name column never holds one); when
  // only the number came off there is nothing safer than the typed line.
  if (tokens.length < typedTokens && (name.length < 2 || (!typeOff && isDirectionOrType(name)) || !/[\p{L}\p{N}]/u.test(name))) {
    return afterNumber.length < typedTokens && afterNumber.join(" ") !== name ? afterNumber.join(" ") : street;
  }
  return name || street;
}

/** The house-number column of a split-address dataset with no streetNumber mapping (the first part before the name column), else undefined. */
function unmappedNumberColumn(
  parts: readonly string[] | undefined,
  nameColumn: string | undefined,
  numberColumn: string | undefined,
): string | undefined {
  if (!parts || !nameColumn || numberColumn) return undefined;
  return parts.indexOf(nameColumn) >= 1 ? parts[0] : undefined;
}

/** The number literal: quoted for text columns (the default), bare for numeric ones. */
function numberLiteral(ds: PropertyDataset, n: string): string {
  return ds.streetNumberType === "number" ? n : `'${n}'`;
}

// ---------------------------------------------------------------------------
// Property datasets (code violations, building permits)
// ---------------------------------------------------------------------------

/**
 * The exact upstream URL the Property Report sends for one dataset and one
 * typed street ("" browses newest-first with no address filter). Behaviour
 * preserving extraction of PropertyReportTabs.fetchDataset: the four provider
 * branches below are its four branches, and PropertyReportTabs.test.tsx pins
 * the URLs. The split-address clause only engages when the dataset maps a
 * streetNumber column AND the street parses to number + a name worth matching.
 */
export function propertyQueryUrl(ds: PropertyDataset, street: string): string {
  const address = street;
  const split = address ? splitFor(ds, address) : null;
  const needle = address ? plainNeedle(ds, address) : "";

  if (ds.type === "socrata") {
    const parts: string[] = [];
    const clauses: string[] = [];
    if (split) {
      clauses.push(
        `upper(${ds.fields.address}) like upper('%${esc(split.name)}%') AND ${ds.fields.streetNumber} = ${numberLiteral(ds, split.number)}`,
      );
    } else if (address) {
      clauses.push(likeAny(needle, (b) => `upper(${ds.fields.address}) like upper('%${b}%')`, ds.houseNumberSpaceRuns));
    }
    if (ds.where) clauses.push(`(${ds.where})`);
    if (clauses.length) parts.push(`$where=${encodeURIComponent(clauses.join(" AND "))}`);
    if (ds.orderField) parts.push(`$order=${encodeURIComponent(ds.orderField + " DESC")}`);
    parts.push(`$limit=${CITY_RECORD_LIMIT}`);
    return `${ds.url}?${parts.join("&")}`;
  }

  if (ds.type === "ckan") {
    // CKAN datastore SQL endpoint. Substring ILIKE mirrors the Socrata/ArcGIS
    // LIKE behaviour exactly.
    const clauses: string[] = [];
    if (split) {
      clauses.push(
        `${sqlId(ds.fields.address)} ILIKE '%${esc(split.name)}%' AND ${sqlId(ds.fields.streetNumber!)} = ${numberLiteral(ds, split.number)}`,
      );
    } else if (address) {
      clauses.push(likeAny(needle, (b) => `${sqlId(ds.fields.address)} ILIKE '%${b}%'`, ds.houseNumberSpaceRuns));
    }
    if (ds.where) clauses.push(`(${ds.where})`);
    const whereSql = clauses.length ? clauses.join(" AND ") : "1=1";
    let sql = `SELECT * FROM "${ds.resourceId}" WHERE ${whereSql}`;
    if (ds.orderField) sql += ` ORDER BY ${sqlId(ds.orderField)} DESC`;
    sql += ` LIMIT ${CITY_RECORD_LIMIT}`;
    return `${ds.url.replace(/\/+$/, "")}/api/3/action/datastore_search_sql?sql=${encodeURIComponent(sql)}`;
  }

  if (ds.type === "carto") {
    // CARTO SQL API (Postgres behind a SQL API): the CKAN shape with NULLS LAST,
    // because Postgres sorts NULLs FIRST on DESC and these tables have undated
    // rows that would otherwise win "newest".
    const clauses: string[] = [];
    if (split) {
      clauses.push(
        `${sqlId(ds.fields.address)} ILIKE '%${esc(split.name)}%' AND ${sqlId(ds.fields.streetNumber!)} = ${numberLiteral(ds, split.number)}`,
      );
    } else if (address) {
      clauses.push(likeAny(needle, (b) => `${sqlId(ds.fields.address)} ILIKE '%${b}%'`, ds.houseNumberSpaceRuns));
    }
    if (ds.where) clauses.push(`(${ds.where})`);
    const whereSql = clauses.length ? clauses.join(" AND ") : "1=1";
    let sql = `SELECT * FROM ${sqlId(ds.resourceId ?? "")} WHERE ${whereSql}`;
    if (ds.orderField) sql += ` ORDER BY ${sqlId(ds.orderField)} DESC NULLS LAST`;
    sql += ` LIMIT ${CITY_RECORD_LIMIT}`;
    return `${ds.url.replace(/\/+$/, "")}/api/v2/sql?q=${encodeURIComponent(sql)}`;
  }

  // ArcGIS REST
  const arcClauses: string[] = [];
  if (split) {
    arcClauses.push(
      `UPPER(${ds.fields.address}) LIKE UPPER('%${esc(split.name)}%') AND ${ds.fields.streetNumber} = ${numberLiteral(ds, split.number)}`,
    );
  } else if (address) {
    arcClauses.push(likeAny(needle, (b) => `UPPER(${ds.fields.address}) LIKE UPPER('%${b}%')`, ds.houseNumberSpaceRuns));
  }
  if (ds.where) arcClauses.push(`(${ds.where})`);
  const where = arcClauses.length ? arcClauses.join(" AND ") : "1=1";
  const qp = [
    `where=${encodeURIComponent(where)}`,
    "outFields=*",
    "returnGeometry=false",
    `resultRecordCount=${CITY_RECORD_LIMIT}`,
    "f=json",
  ];
  if (ds.orderField) qp.push(`orderByFields=${encodeURIComponent(ds.orderField + " DESC")}`);
  return `${ds.url.replace(/\/+$/, "")}/query?${qp.join("&")}`;
}

// ---------------------------------------------------------------------------
// Zoning cases
// ---------------------------------------------------------------------------

function statusClause(src: CasesSource, statuses: string[], quoteUpper: boolean): string | null {
  if (!statuses.length) return null;
  const list = statuses.map((s) => `'${esc(s)}'`).join(",");
  return `${src.fields.status} ${quoteUpper ? "IN" : "in"} (${list})`;
}

/** The ArcGIS /query parameter list every arcgis zoning adapter starts from. */
function arcgisBaseParams(where: string): string[] {
  return [
    `where=${encodeURIComponent(where)}`,
    "outFields=*",
    "returnGeometry=false",
    `resultRecordCount=${CITY_RECORD_LIMIT}`,
    "f=json",
  ];
}

/**
 * The exact upstream URL the Zoning Cases tool sends for a docket and a typed
 * street: the Socrata and ArcGIS address adapters in zoning-providers.ts, whose
 * URLs zoning-providers.test.ts pins. For a location or parcel lookup only the
 * empty street has a single-URL answer (the newest-first browse every adapter
 * degrades to); a typed street needs a geocoded point or a parcel id first, so
 * it returns null there (see casesLocationTemplate and the parcel query note).
 */
export function casesQueryUrl(src: CasesSource, street: string, statuses: string[] = []): string | null {
  const lookup = src.lookup ?? "address";
  if (lookup !== "address" && street) return null;
  if (src.type === "socrata") {
    const clauses: string[] = [];
    if (street) clauses.push(likeAny(street, (b) => `upper(${src.fields.address}) like upper('%${b}%')`, src.houseNumberSpaceRuns));
    const st = statusClause(src, statuses, false);
    if (st) clauses.push(st);
    if (src.where) clauses.push(`(${src.where})`);
    const parts: string[] = [];
    if (clauses.length) parts.push(`$where=${encodeURIComponent(clauses.join(" AND "))}`);
    if (src.orderField) parts.push(`$order=${encodeURIComponent(src.orderField + " DESC")}`);
    parts.push(`$limit=${CITY_RECORD_LIMIT}`);
    return `${src.url}?${parts.join("&")}`;
  }
  const clauses: string[] = [];
  if (street) clauses.push(likeAny(street, (b) => `UPPER(${src.fields.address}) LIKE UPPER('%${b}%')`, src.houseNumberSpaceRuns));
  const st = statusClause(src, statuses, true);
  if (st) clauses.push(st);
  if (src.where) clauses.push(`(${src.where})`);
  const where = clauses.length ? clauses.join(" AND ") : "1=1";
  const parts = arcgisBaseParams(where);
  if (src.orderField) parts.push(`orderByFields=${encodeURIComponent(src.orderField + " DESC")}`);
  return `${src.url.replace(/\/+$/, "")}/query?${parts.join("&")}`;
}

/**
 * Placeholder an agent replaces with "lon,lat" (WGS84) in a location template.
 * The only placeholder: a street never appears in a template, because a typed
 * street has to be escaped for the provider's SQL and a template invites pasting
 * it in raw ("O'Brien" would close the literal). A street goes through
 * propertyQueryUrl / casesQueryUrl (the package's buildCityQuery, the hosted
 * tool's query_url), which escape it.
 */
export const POINT_PLACEHOLDER = "{LON},{LAT}";

/**
 * Polygon-only dockets (Denver, Charlotte, Atlanta, Durham): the URL the
 * location adapter sends once it has a point, with {LON},{LAT} where the point
 * goes. The parameter order is the adapter's (zoning-providers.ts
 * ArcgisLocationProvider), so this is the request the site makes, not a
 * paraphrase of it.
 */
export function casesLocationTemplate(src: CasesSource, statuses: string[] = []): string | null {
  if ((src.lookup ?? "address") !== "location") return null;
  const clauses: string[] = [];
  const st = statusClause(src, statuses, true);
  if (st) clauses.push(st);
  if (src.where) clauses.push(`(${src.where})`);
  const where = clauses.length ? clauses.join(" AND ") : "1=1";
  const parts = arcgisBaseParams(where);
  parts.push(
    `geometry=${POINT_PLACEHOLDER}`,
    "geometryType=esriGeometryPoint",
    "inSR=4326",
    "spatialRel=esriSpatialRelIntersects",
  );
  if (src.orderField) parts.push(`orderByFields=${encodeURIComponent(src.orderField + " DESC")}`);
  return `${src.url.replace(/\/+$/, "")}/query?${parts.join("&")}`;
}

/**
 * The current-zoning map lookup (Dallas): one point-intersect against the base
 * zoning layer, with {LON},{LAT} where the point goes. Mirrors
 * ZoningCasesTool.fetchCurrentZoning, outFields included.
 */
export function currentZoningTemplate(cz: CurrentZoningSource): string {
  const f = cz.fields;
  const outFields = [f.zoneDist, f.longZoneDist, f.pdNum, f.caseNumber, f.effectiveDate, f.districtUse]
    .filter(Boolean)
    .join(",");
  const base = cz.url.replace(/\/+$/, "");
  const params = [
    `geometry=${POINT_PLACEHOLDER}`,
    "geometryType=esriGeometryPoint",
    "inSR=4326",
    "spatialRel=esriSpatialRelIntersects",
    `outFields=${encodeURIComponent(outFields)}`,
    "returnGeometry=false",
    "f=json",
  ];
  return `${base}/query?${params.join("&")}`;
}

// ---------------------------------------------------------------------------
// City summaries: the two registries merged into one list
// ---------------------------------------------------------------------------

export type CityKind = DatasetKind | "zoning";

export interface CitySummary {
  slug: string;
  /** Display name: the property registry's where both registries list the city. */
  city: string;
  state: string;
  stateAbbrev: string;
  countyName?: string;
  countySlug?: string;
  kinds: CityKind[];
  /** Every name either registry uses for the city, for matching. */
  names: string[];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lower-case, no punctuation, single spaces: the key names are matched on. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Merge the two registries' populated index entries into one summary per slug.
 * Property kinds come from the index entry's `datasets` (the file's dataset
 * keys, held in the index so a reader with only the index can state them);
 * every zoning entry contributes "zoning". Names from both registries are kept
 * for matching ("Washington, DC" and "Washington"; "New York City" and "New
 * York"); the property registry's name is displayed when both exist.
 */
export function mergeCityIndexes(
  property: readonly CityPropertyIndexEntry[],
  zoning: readonly CityIndexEntry[],
): CitySummary[] {
  const bySlug = new Map<string, CitySummary>();
  for (const p of property) {
    if (!p.populated) continue;
    bySlug.set(p.slug, {
      slug: p.slug,
      city: p.city,
      state: p.state,
      stateAbbrev: p.stateAbbrev,
      countyName: p.countyName,
      countySlug: p.countySlug,
      kinds: [...(p.datasets ?? [])],
      names: [p.city],
    });
  }
  for (const z of zoning) {
    if (!z.populated) continue;
    const have = bySlug.get(z.slug);
    if (have) {
      if (!have.kinds.includes("zoning")) have.kinds.push("zoning");
      if (!have.names.includes(z.city)) have.names.push(z.city);
      if (!have.countyName && z.countyName) have.countyName = z.countyName;
      if (!have.countySlug && z.countySlug) have.countySlug = z.countySlug;
      continue;
    }
    bySlug.set(z.slug, {
      slug: z.slug,
      city: z.city,
      state: z.state,
      stateAbbrev: z.stateAbbrev,
      countyName: z.countyName,
      countySlug: z.countySlug,
      kinds: ["zoning"],
      names: [z.city],
    });
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * The only aliases: the New York City and Washington, DC forms. Not "LA", which
 * is also Louisiana. Keys are normalizeName() output.
 */
export const CITY_ALIASES: Readonly<Record<string, string>> = {
  nyc: "nyc",
  "new york": "nyc",
  "new york city": "nyc",
  "city of new york": "nyc",
  dc: "washington-dc",
  "washington dc": "washington-dc",
  "washington d c": "washington-dc",
  "district of columbia": "washington-dc",
};

/** Whether a city is in the given state: a 2-letter code or the state's name; "" matches all. */
export function cityInState(c: CitySummary, state: string): boolean {
  const s = normalizeName(state);
  if (!s) return true;
  // "TX", "D.C." and "d c" all read as the two-letter code.
  if (/^[a-z]{2}$/.test(s.replace(/ /g, ""))) return c.stateAbbrev.toLowerCase() === s.replace(/ /g, "");
  return normalizeName(c.state) === s;
}

/**
 * Resolve a city reference against a summary list: slug, then exact normalised
 * name, then "Name, ST" with the state read off the end, then the alias list.
 * Returns 0, 1 or many: two cities called Columbus in two states come back as a
 * list unless `state` narrows them. No lat/lon and no centroid guess: the
 * registry has no city boundaries, and neighbours like Phoenix, Mesa and
 * Scottsdale share borders.
 */
export function findCityIn(cities: readonly CitySummary[], ref: string, state?: string): CitySummary[] {
  let name = ref.trim();
  let stateHint = state?.trim() ?? "";
  const comma = name.indexOf(",");
  if (comma >= 0) {
    const tail = name.slice(comma + 1).trim();
    name = name.slice(0, comma).trim();
    if (!stateHint && tail) stateHint = tail;
  }
  if (!name) return [];
  const inState = (c: CitySummary) => cityInState(c, stateHint);

  const asSlug = slugify(name);
  const bySlug = cities.filter((c) => c.slug === asSlug && inState(c));
  if (bySlug.length) return bySlug;

  const key = normalizeName(name);
  const byName = cities.filter((c) => c.names.some((n) => normalizeName(n) === key) && inState(c));
  if (byName.length) return byName;

  // Own keys only: "constructor" or "__proto__" as a city must not read the prototype.
  const alias = Object.prototype.hasOwnProperty.call(CITY_ALIASES, key) ? CITY_ALIASES[key] : undefined;
  if (alias) return cities.filter((c) => c.slug === alias && inState(c));
  return [];
}

/** Every covered city inside one atlas county, by the atlas's state and county slugs. */
export function citiesForCountyIn(cities: readonly CitySummary[], stateSlug: string, countySlug: string): CitySummary[] {
  return cities.filter((c) => c.countySlug === countySlug && slugify(c.state) === stateSlug);
}

/** Path of the city's page on urbankitstudio.com for one kind of data. */
export function cityPath(slug: string, kind: CityKind): string {
  return kind === "zoning" ? `/tools/zoning-cases/${slug}` : `/tools/property-report/${slug}`;
}

// ---------------------------------------------------------------------------
// Dataset descriptors: what an agent needs to query a dataset itself
// ---------------------------------------------------------------------------

export type CityProvider = "socrata" | "arcgis" | "ckan" | "carto";
export type CityLookup = "address" | "location" | "parcel";

/**
 * A point lookup's request with its numeric placeholder. Only location lookups
 * (polygon dockets, current-zoning maps) carry one: an address lookup has no
 * template, since its street must be escaped (see POINT_PLACEHOLDER).
 */
export interface CityQueryTemplate {
  /** The endpoint the parameters are appended to. */
  base: string;
  /** Query parameters as sent, with the placeholder un-encoded inside the value. */
  params: Record<string, string>;
  /** The token to replace: {LON},{LAT}, longitude first. */
  substitute: string;
}

export interface CityDatasetDescriptor {
  /** The city this dataset belongs to, so a descriptor can be queried on its own. */
  citySlug: string;
  kind: CityKind;
  /** Zoning only: an address-searchable case log, or the current zoning map. */
  zoningMode?: "cases" | "current-zoning";
  provider: CityProvider;
  endpoint: string;
  resourceId?: string;
  lookup: CityLookup;
  addressField?: string;
  addressParts?: string[];
  streetNumberField?: string;
  /** The column the dataset sorts by, newest first. */
  dateField?: string;
  /** A filter that is part of the dataset's definition; keep it in every query. */
  scopeWhere?: string;
  /** Canonical name -> column name, as the registry maps it. */
  fields: Record<string, string | string[]>;
  statusBuckets?: PropertyStatusBuckets | ZoningStatusBuckets;
  coverage?: string;
  scopeNote?: string;
  /**
   * Always true: the site calls every registered dataset from the browser, so
   * a source without CORS cannot be registered. An invariant, not a stored flag.
   */
  corsEnabled: true;
  freshness: {
    lastVerified: string;
    latestRecordDate: string | null;
    dateField: string | null;
  };
  /** Location lookups only; null for an address or parcel lookup. */
  queryTemplate: CityQueryTemplate | null;
  /** Newest-first with no street filter: returns rows whenever the dataset is live. */
  sampleQuery: string | null;
  queryNote: string;
}

const SOCRATA_NOTE =
  " Socrata throttles anonymous callers: for volume, send an X-App-Token header with your own app token.";

/**
 * The site's LIKE match leaves the pattern characters active, so a typed '%'
 * widens the match and '_' stands for one character. Said in every address
 * note rather than escaped, because escaping would change the site's own URLs.
 */
const WILDCARD_NOTE =
  "LIKE wildcards in the street stay active, as on the site: '%' matches any run of characters and '_' exactly one.";

/**
 * Said only in the note of a dataset that sets houseNumberSpaceRuns (Orlando's
 * code cases, permits and zoning applications, which store a run of spaces after
 * the house number; see likeAlternatives). Every other dataset matches the typed
 * spacing exactly, as it always has, and says nothing.
 */
function spacesNote(runs: number | undefined): string {
  const n = Math.min(Math.floor(runs ?? 0), HOUSE_GAP_LIMIT);
  if (!(n >= 1)) return "";
  return ` The space after a leading house number also matches a run of up to ${n} spaces, or the spacing as typed, and nothing else, as in Orlando's '4274  TATUM ST' ('4274 Tatum St' does not find '4274 OLD TATUM ST'). As before, the number is not anchored on its left: '12 Main' also finds '3312 MAIN'.`;
}

function propertyNote(ds: PropertyDataset): string {
  const parts: string[] = [];
  const numberColumn = unmappedNumberColumn(ds.fields.addressParts, ds.fields.address, ds.fields.streetNumber);
  if (ds.fields.streetNumber) {
    parts.push(
      `The street is split: type 'number name' ('1422 N Western Ave') and the number is matched on ${ds.fields.streetNumber} while the name is matched on ${ds.fields.address}; a street name alone is matched on ${ds.fields.address} too, with the same trimming (a leading direction and a trailing street type come off: 'N Western Ave' matches 'Western').${spacesNote(ds.houseNumberSpaceRuns)}`,
    );
  } else if (numberColumn) {
    parts.push(
      `Case-insensitive substring match on ${ds.fields.address}, which holds the street name (the house number is in ${numberColumn}): the query matches the street name on ${ds.fields.address} and returns every row on that street; filter by house number in the results.`,
    );
  } else {
    parts.push(
      `Case-insensitive substring match on ${ds.fields.address}: a street name alone ('Commerce') returns the most, and a number plus name matches only rows whose ${ds.fields.address} contains that exact text.${spacesNote(ds.houseNumberSpaceRuns)}`,
    );
  }
  parts.push(WILDCARD_NOTE);
  if (ds.where) parts.push("The where clause is part of the dataset definition: keep it in every query.");
  if (!ds.orderField) parts.push("The source cannot sort by date: re-sort the rows yourself.");
  return parts.join(" ") + (ds.type === "socrata" ? SOCRATA_NOTE : "");
}

function casesNote(src: CasesSource): string {
  const lookup = src.lookup ?? "address";
  const parts: string[] = [];
  if (lookup === "location") {
    parts.push(
      `This docket is published on parcel shapes and has no address column: geocode the address to a WGS84 point, put it in the template as ${POINT_PLACEHOLDER} (longitude first), and the server answers point-in-polygon. With no geometry the template browses newest first.`,
    );
  } else if (lookup === "parcel") {
    const xw = src.crosswalk;
    parts.push(
      `This docket is keyed by parcel, not address: resolve the address to a BBL with https://geosearch.planninglabs.nyc/v2/search?text=<address>&size=1 (properties.addendum.pad.bbl), read the case ids from the crosswalk ${xw?.url ?? ""} where ${xw?.parcelField ?? "bbl"}='<bbl>' (column ${xw?.projectField ?? "project_id"}), then query the endpoint with ${src.joinField ?? xw?.projectField ?? "project_id"} in ('<id>',...). sample_query is the newest-first browse.`,
    );
  } else {
    const numberColumn = unmappedNumberColumn(src.fields.addressParts, src.fields.address, undefined);
    parts.push(
      numberColumn
        ? `Case-insensitive substring match on ${src.fields.address}, which holds the street name (the house number is in ${numberColumn}): the query matches the street name on ${src.fields.address} and returns every row on that street; filter by house number in the results.`
        : `Case-insensitive substring match on ${src.fields.address}: a street name alone returns the most.${spacesNote(src.houseNumberSpaceRuns)}`,
    );
    parts.push(`Filter by status with ${src.fields.status ?? "the status column"} in (...) using the status_buckets values.`);
    parts.push(WILDCARD_NOTE);
  }
  if (src.where) parts.push("The where clause is part of the dataset definition: keep it in every query.");
  return parts.join(" ") + (src.type === "socrata" ? SOCRATA_NOTE : "");
}

const CURRENT_ZONING_NOTE =
  `Not a case log: this is the current base-zoning map. Geocode the address to a WGS84 point, put it in the template as ${POINT_PLACEHOLDER} (longitude first), and the intersecting polygon is the property's zoning district today.`;

function templateFromUrl(url: string, substitute: string): CityQueryTemplate {
  const q = url.indexOf("?");
  const base = q >= 0 ? url.slice(0, q) : url;
  // No prototype: a parameter named "__proto__" lands as an own key, not a write to Object.prototype.
  const params: Record<string, string> = Object.create(null) as Record<string, string>;
  if (q >= 0) {
    for (const pair of url.slice(q + 1).split("&")) {
      const eq = pair.indexOf("=");
      const k = eq >= 0 ? pair.slice(0, eq) : pair;
      const v = eq >= 0 ? pair.slice(eq + 1) : "";
      params[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }
  return { base, params, substitute };
}

function fieldRecord(fields: PropertyFieldMap | CasesSource["fields"] | CurrentZoningSource["fields"]): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    out[k] = v as string | string[];
  }
  return out;
}

export function propertyDescriptor(city: CityProperty, ds: PropertyDataset): CityDatasetDescriptor {
  const dateField = ds.orderField ?? ds.fields.openedDate;
  return {
    citySlug: city.slug,
    kind: ds.kind,
    provider: ds.type,
    endpoint: ds.url,
    resourceId: ds.resourceId,
    lookup: "address",
    addressField: ds.fields.address,
    addressParts: ds.fields.addressParts,
    streetNumberField: ds.fields.streetNumber,
    dateField,
    scopeWhere: ds.where,
    fields: fieldRecord(ds.fields),
    statusBuckets: ds.statusBuckets,
    coverage: ds.coverage,
    scopeNote: city.scopeNote,
    corsEnabled: true,
    freshness: {
      lastVerified: city.lastVerified,
      latestRecordDate: ds.latestRecordDate ?? null,
      dateField: dateField ?? null,
    },
    queryTemplate: null,
    sampleQuery: propertyQueryUrl(ds, ""),
    queryNote: propertyNote(ds),
  };
}

export function zoningDescriptor(city: CityZoning): CityDatasetDescriptor | null {
  const mode = city.kind ?? "cases";
  if (mode === "current-zoning") {
    const cz = city.currentZoning;
    if (!cz) return null;
    const template = currentZoningTemplate(cz);
    return {
      citySlug: city.slug,
      kind: "zoning",
      zoningMode: "current-zoning",
      provider: cz.type,
      endpoint: cz.url,
      lookup: "location",
      fields: fieldRecord(cz.fields),
      corsEnabled: true,
      freshness: { lastVerified: city.lastVerified, latestRecordDate: null, dateField: null },
      queryTemplate: templateFromUrl(template, POINT_PLACEHOLDER),
      sampleQuery: null,
      queryNote: CURRENT_ZONING_NOTE,
    };
  }
  const src = city.cases;
  if (!src) return null;
  const lookup = src.lookup ?? "address";
  const dateField = src.orderField ?? src.fields.appliedDate;
  const template = lookup === "location" ? templateFromUrl(casesLocationTemplate(src)!, POINT_PLACEHOLDER) : null;
  return {
    citySlug: city.slug,
    kind: "zoning",
    zoningMode: "cases",
    provider: src.type,
    endpoint: src.url,
    lookup,
    addressField: src.fields.address,
    addressParts: src.fields.addressParts,
    dateField,
    scopeWhere: src.where,
    fields: fieldRecord(src.fields),
    statusBuckets: src.statusBuckets,
    coverage: src.caseLabel,
    corsEnabled: true,
    freshness: {
      lastVerified: city.lastVerified,
      latestRecordDate: src.latestRecordDate ?? null,
      dateField: dateField ?? null,
    },
    queryTemplate: template,
    sampleQuery: casesQueryUrl(src, ""),
    queryNote: casesNote(src),
  };
}

/**
 * Every dataset a city publishes, violations then permits then zoning. Either
 * record may be null when the city is in one registry only.
 */
export function cityDatasetDescriptors(
  property: CityProperty | null | undefined,
  zoning: CityZoning | null | undefined,
  kind?: CityKind,
): CityDatasetDescriptor[] {
  const out: CityDatasetDescriptor[] = [];
  if (property) {
    for (const k of ["violations", "permits"] as const) {
      const ds = property.datasets[k];
      if (ds && (!kind || kind === k)) out.push(propertyDescriptor(property, ds));
    }
  }
  if (zoning && (!kind || kind === "zoning")) {
    const d = zoningDescriptor(zoning);
    if (d) out.push(d);
  }
  return out;
}

/**
 * The URL the site sends for one descriptor's dataset and a typed street, built
 * from the registry records (never from the readable template, whose decoded
 * parameters would not round-trip byte for byte). Null when the lookup needs a
 * point or a parcel id first: then queryTemplate is the answer.
 */
export function datasetQueryUrl(
  d: CityDatasetDescriptor,
  property: CityProperty | null | undefined,
  zoning: CityZoning | null | undefined,
  street: string,
): string | null {
  if (d.kind === "zoning") {
    if (!zoning || (zoning.kind ?? "cases") !== "cases" || !zoning.cases) return null;
    return casesQueryUrl(zoning.cases, street);
  }
  const ds = property?.datasets[d.kind];
  return ds ? propertyQueryUrl(ds, street) : null;
}

/**
 * The street an agent query matches for this descriptor: the derived street
 * name on a split-address dataset with no mapped number column (see
 * splitAddressStreetName), otherwise the street as typed. Callers pass the
 * result to datasetQueryUrl and report it as the street used.
 */
export function streetForDataset(d: CityDatasetDescriptor, street: string): string {
  if (!street || d.lookup !== "address") return street;
  return splitAddressStreetName(d.addressParts, d.addressField, d.streetNumberField, street);
}

// CORE-COPY-END

// ---------------------------------------------------------------------------
// Public API over the bundled registries
// ---------------------------------------------------------------------------

const SUMMARIES: CitySummary[] = mergeCityIndexes(cityPropertyIndex.cities, cityZoningIndex.cities);

/** The hosted tool's cap on a street argument, applied here too (splitStreet backtracks on a long run of digits). */
export const CITY_STREET_MAX_LEN = 120;

/** A JavaScript caller may pass null or a number where the types say string; read it as text. */
function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * The street a query is built from: text, at most CITY_STREET_MAX_LEN
 * characters, well-formed (a lone surrogate would make encodeURIComponent throw
 * a URIError from inside the query builder). Throws a RangeError or TypeError
 * with a plain message instead; nothing is truncated silently, because a
 * truncated street is a different query.
 */
function streetArg(value: unknown): string {
  const street = text(value);
  if (street.length > CITY_STREET_MAX_LEN) {
    throw new RangeError(`street must be at most ${CITY_STREET_MAX_LEN} characters`);
  }
  try {
    encodeURIComponent(street);
  } catch {
    throw new TypeError("street must be well-formed text (no unpaired surrogate)");
  }
  return street;
}

export interface CityFilter {
  /** A 2-letter code ("TX") or a state name ("Texas"). */
  state?: string;
  kind?: CityKind;
  /** An atlas county slug ("maricopa-county"). */
  countySlug?: string;
}

/** Every covered city, optionally narrowed by state, dataset kind or county. */
export function listCities(filter: CityFilter = {}): CitySummary[] {
  return SUMMARIES.filter(
    (c) =>
      (!filter.state || cityInState(c, filter.state)) &&
      (!filter.kind || c.kinds.includes(filter.kind)) &&
      (!filter.countySlug || c.countySlug === filter.countySlug),
  ).map((c) => ({ ...c, kinds: [...c.kinds], names: [...c.names] }));
}

/**
 * Resolve a slug ("fort-worth"), a name ("Fort Worth"), a name with its state
 * ("Fort Worth, TX") or an alias ("NYC", "DC"). 0, 1 or many: an ambiguous
 * name comes back as a list, which `state` narrows.
 */
export function findCity(ref: string, state?: string): CitySummary[] {
  return findCityIn(SUMMARIES, text(ref), state === null || state === undefined ? undefined : text(state)).map((c) => ({
    ...c,
    kinds: [...c.kinds],
    names: [...c.names],
  }));
}

/** The city's code-violation and building-permit registry record. */
export function getCityProperty(slug: string): CityProperty | undefined {
  return Object.prototype.hasOwnProperty.call(PROPERTY_CITIES, slug) ? PROPERTY_CITIES[slug] : undefined;
}

/** The city's zoning-case registry record. */
export function getCityZoning(slug: string): CityZoning | undefined {
  return Object.prototype.hasOwnProperty.call(ZONING_CITIES, slug) ? ZONING_CITIES[slug] : undefined;
}

/** Every dataset the city publishes (violations, permits, zoning), or one kind. */
export function cityDatasets(slug: string, kind?: CityKind): CityDatasetDescriptor[] {
  return cityDatasetDescriptors(getCityProperty(text(slug)), getCityZoning(text(slug)), kind);
}

/**
 * The URL the hosted tool answers with for this dataset and street ("" for the
 * newest-first browse): the site's own request, except that a dataset whose
 * table splits the address across columns with no mapped number column is
 * matched on the derived street name (streetForDataset; the site's URL as sent
 * is propertyQueryUrl / casesQueryUrl). Null when the lookup needs a point or a
 * parcel id first: use dataset.queryTemplate then. Throws a RangeError for a
 * street over CITY_STREET_MAX_LEN characters and a TypeError for malformed text.
 */
export function buildCityQuery(dataset: CityDatasetDescriptor, street: string): string | null {
  const slug = text(dataset?.citySlug);
  return datasetQueryUrl(dataset, getCityProperty(slug), getCityZoning(slug), streetForDataset(dataset, streetArg(street)));
}

/** Every covered city inside one atlas county (Maricopa County lists each of its cities). */
export function citiesForCounty(stateSlug: string, countySlug: string): CitySummary[] {
  return citiesForCountyIn(SUMMARIES, stateSlug, countySlug).map((c) => ({ ...c, kinds: [...c.kinds], names: [...c.names] }));
}
