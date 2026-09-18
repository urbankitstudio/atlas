import type { AtlasIndex, StateFile } from "./types.js";

import indexJson from "../data/index.json" with { type: "json" };
import alabamaJson from "../data/alabama.json" with { type: "json" };
import alaskaJson from "../data/alaska.json" with { type: "json" };
import arizonaJson from "../data/arizona.json" with { type: "json" };
import arkansasJson from "../data/arkansas.json" with { type: "json" };
import californiaJson from "../data/california.json" with { type: "json" };
import coloradoJson from "../data/colorado.json" with { type: "json" };
import connecticutJson from "../data/connecticut.json" with { type: "json" };
import delawareJson from "../data/delaware.json" with { type: "json" };
import floridaJson from "../data/florida.json" with { type: "json" };
import georgiaJson from "../data/georgia.json" with { type: "json" };
import hawaiiJson from "../data/hawaii.json" with { type: "json" };
import idahoJson from "../data/idaho.json" with { type: "json" };
import illinoisJson from "../data/illinois.json" with { type: "json" };
import indianaJson from "../data/indiana.json" with { type: "json" };
import iowaJson from "../data/iowa.json" with { type: "json" };
import kansasJson from "../data/kansas.json" with { type: "json" };
import kentuckyJson from "../data/kentucky.json" with { type: "json" };
import louisianaJson from "../data/louisiana.json" with { type: "json" };
import maineJson from "../data/maine.json" with { type: "json" };
import marylandJson from "../data/maryland.json" with { type: "json" };
import massachusettsJson from "../data/massachusetts.json" with { type: "json" };
import michiganJson from "../data/michigan.json" with { type: "json" };
import minnesotaJson from "../data/minnesota.json" with { type: "json" };
import mississippiJson from "../data/mississippi.json" with { type: "json" };
import missouriJson from "../data/missouri.json" with { type: "json" };
import montanaJson from "../data/montana.json" with { type: "json" };
import nebraskaJson from "../data/nebraska.json" with { type: "json" };
import nevadaJson from "../data/nevada.json" with { type: "json" };
import newHampshireJson from "../data/new-hampshire.json" with { type: "json" };
import newJerseyJson from "../data/new-jersey.json" with { type: "json" };
import newMexicoJson from "../data/new-mexico.json" with { type: "json" };
import newYorkJson from "../data/new-york.json" with { type: "json" };
import northCarolinaJson from "../data/north-carolina.json" with { type: "json" };
import northDakotaJson from "../data/north-dakota.json" with { type: "json" };
import ohioJson from "../data/ohio.json" with { type: "json" };
import oklahomaJson from "../data/oklahoma.json" with { type: "json" };
import oregonJson from "../data/oregon.json" with { type: "json" };
import pennsylvaniaJson from "../data/pennsylvania.json" with { type: "json" };
import rhodeIslandJson from "../data/rhode-island.json" with { type: "json" };
import southCarolinaJson from "../data/south-carolina.json" with { type: "json" };
import southDakotaJson from "../data/south-dakota.json" with { type: "json" };
import tennesseeJson from "../data/tennessee.json" with { type: "json" };
import texasJson from "../data/texas.json" with { type: "json" };
import utahJson from "../data/utah.json" with { type: "json" };
import vermontJson from "../data/vermont.json" with { type: "json" };
import virginiaJson from "../data/virginia.json" with { type: "json" };
import washingtonJson from "../data/washington.json" with { type: "json" };
import westVirginiaJson from "../data/west-virginia.json" with { type: "json" };
import wisconsinJson from "../data/wisconsin.json" with { type: "json" };
import wyomingJson from "../data/wyoming.json" with { type: "json" };

export const atlasIndex: AtlasIndex = indexJson as AtlasIndex;

const POPULATED_STATES: Record<string, StateFile> = {
  alabama: alabamaJson as StateFile,
  alaska: alaskaJson as StateFile,
  arizona: arizonaJson as StateFile,
  arkansas: arkansasJson as StateFile,
  california: californiaJson as StateFile,
  colorado: coloradoJson as StateFile,
  connecticut: connecticutJson as StateFile,
  delaware: delawareJson as StateFile,
  florida: floridaJson as StateFile,
  georgia: georgiaJson as StateFile,
  hawaii: hawaiiJson as StateFile,
  idaho: idahoJson as StateFile,
  illinois: illinoisJson as StateFile,
  indiana: indianaJson as StateFile,
  iowa: iowaJson as StateFile,
  kansas: kansasJson as StateFile,
  kentucky: kentuckyJson as StateFile,
  louisiana: louisianaJson as StateFile,
  maine: maineJson as StateFile,
  maryland: marylandJson as StateFile,
  massachusetts: massachusettsJson as StateFile,
  michigan: michiganJson as StateFile,
  minnesota: minnesotaJson as StateFile,
  mississippi: mississippiJson as StateFile,
  missouri: missouriJson as StateFile,
  montana: montanaJson as StateFile,
  nebraska: nebraskaJson as StateFile,
  nevada: nevadaJson as StateFile,
  "new-hampshire": newHampshireJson as StateFile,
  "new-jersey": newJerseyJson as StateFile,
  "new-mexico": newMexicoJson as StateFile,
  "new-york": newYorkJson as StateFile,
  "north-carolina": northCarolinaJson as StateFile,
  "north-dakota": northDakotaJson as StateFile,
  ohio: ohioJson as StateFile,
  oklahoma: oklahomaJson as StateFile,
  oregon: oregonJson as StateFile,
  pennsylvania: pennsylvaniaJson as StateFile,
  "rhode-island": rhodeIslandJson as StateFile,
  "south-carolina": southCarolinaJson as StateFile,
  "south-dakota": southDakotaJson as StateFile,
  tennessee: tennesseeJson as StateFile,
  texas: texasJson as StateFile,
  utah: utahJson as StateFile,
  vermont: vermontJson as StateFile,
  virginia: virginiaJson as StateFile,
  washington: washingtonJson as StateFile,
  "west-virginia": westVirginiaJson as StateFile,
  wisconsin: wisconsinJson as StateFile,
  wyoming: wyomingJson as StateFile,
};

export interface Atlas {
  version: string;
  lastUpdated: string;
  states: AtlasIndex["states"];
  totals: AtlasIndex["totals"];
  byStateSlug: Map<string, StateFile>;
}

export const atlas: Atlas = {
  version: atlasIndex.version,
  lastUpdated: atlasIndex.lastUpdated,
  states: atlasIndex.states,
  totals: atlasIndex.totals,
  byStateSlug: new Map(Object.entries(POPULATED_STATES)),
};
