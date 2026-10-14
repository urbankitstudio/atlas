// Bundled city registries. The JSON under ../data/city-property and
// ../data/city-zoning is copied from the monorepo's public/data by
// scripts/sync-atlas-package.mjs; one explicit import per populated city,
// following data.ts, so a city that is indexed but not imported fails the
// monorepo's validate-registries gate instead of resolving to nothing.
import type {
  CityPropertyIndex,
  CityPropertyRecord,
  CityZoningIndex,
  CityZoningRecord,
} from "./city-types.js";

import propertyIndexJson from "../data/city-property/index.json" with { type: "json" };
import propertyDallas from "../data/city-property/dallas.json" with { type: "json" };
import propertyChicago from "../data/city-property/chicago.json" with { type: "json" };
import propertyNashville from "../data/city-property/nashville.json" with { type: "json" };
import propertyAustin from "../data/city-property/austin.json" with { type: "json" };
import propertySeattle from "../data/city-property/seattle.json" with { type: "json" };
import propertyNyc from "../data/city-property/nyc.json" with { type: "json" };
import propertySanFrancisco from "../data/city-property/san-francisco.json" with { type: "json" };
import propertyDetroit from "../data/city-property/detroit.json" with { type: "json" };
import propertyLasVegas from "../data/city-property/las-vegas.json" with { type: "json" };
import propertyKansasCity from "../data/city-property/kansas-city.json" with { type: "json" };
import propertyColumbus from "../data/city-property/columbus.json" with { type: "json" };
import propertyBoston from "../data/city-property/boston.json" with { type: "json" };
import propertySanAntonio from "../data/city-property/san-antonio.json" with { type: "json" };
import propertyMilwaukee from "../data/city-property/milwaukee.json" with { type: "json" };
import propertyCharlotte from "../data/city-property/charlotte.json" with { type: "json" };
import propertyDenver from "../data/city-property/denver.json" with { type: "json" };
import propertyWashingtonDc from "../data/city-property/washington-dc.json" with { type: "json" };
import propertyPhiladelphia from "../data/city-property/philadelphia.json" with { type: "json" };
import propertyAtlanta from "../data/city-property/atlanta.json" with { type: "json" };
import propertyPhoenix from "../data/city-property/phoenix.json" with { type: "json" };
import propertyLosAngeles from "../data/city-property/los-angeles.json" with { type: "json" };
import propertyFortWorth from "../data/city-property/fort-worth.json" with { type: "json" };
import propertyMesa from "../data/city-property/mesa.json" with { type: "json" };
import propertyMinneapolis from "../data/city-property/minneapolis.json" with { type: "json" };
import propertyWichita from "../data/city-property/wichita.json" with { type: "json" };
import propertyCleveland from "../data/city-property/cleveland.json" with { type: "json" };
import propertyNewOrleans from "../data/city-property/new-orleans.json" with { type: "json" };
import propertyOrlando from "../data/city-property/orlando.json" with { type: "json" };
import propertyCincinnati from "../data/city-property/cincinnati.json" with { type: "json" };
import propertyScottsdale from "../data/city-property/scottsdale.json" with { type: "json" };

import zoningIndexJson from "../data/city-zoning/index.json" with { type: "json" };
import zoningAustin from "../data/city-zoning/austin.json" with { type: "json" };
import zoningDallas from "../data/city-zoning/dallas.json" with { type: "json" };
import zoningNashville from "../data/city-zoning/nashville.json" with { type: "json" };
import zoningDenver from "../data/city-zoning/denver.json" with { type: "json" };
import zoningCharlotte from "../data/city-zoning/charlotte.json" with { type: "json" };
import zoningBoston from "../data/city-zoning/boston.json" with { type: "json" };
import zoningAtlanta from "../data/city-zoning/atlanta.json" with { type: "json" };
import zoningNewOrleans from "../data/city-zoning/new-orleans.json" with { type: "json" };
import zoningTampa from "../data/city-zoning/tampa.json" with { type: "json" };
import zoningIndianapolis from "../data/city-zoning/indianapolis.json" with { type: "json" };
import zoningDurham from "../data/city-zoning/durham.json" with { type: "json" };
import zoningWashingtonDc from "../data/city-zoning/washington-dc.json" with { type: "json" };
import zoningNyc from "../data/city-zoning/nyc.json" with { type: "json" };
import zoningLosAngeles from "../data/city-zoning/los-angeles.json" with { type: "json" };
import zoningFortWorth from "../data/city-zoning/fort-worth.json" with { type: "json" };
import zoningRaleigh from "../data/city-zoning/raleigh.json" with { type: "json" };
import zoningBoise from "../data/city-zoning/boise.json" with { type: "json" };
import zoningOrlando from "../data/city-zoning/orlando.json" with { type: "json" };
import zoningScottsdale from "../data/city-zoning/scottsdale.json" with { type: "json" };

export const cityPropertyIndex: CityPropertyIndex = propertyIndexJson as CityPropertyIndex;
export const cityZoningIndex: CityZoningIndex = zoningIndexJson as CityZoningIndex;

export const PROPERTY_CITIES: Record<string, CityPropertyRecord> = {
  dallas: propertyDallas as CityPropertyRecord,
  chicago: propertyChicago as CityPropertyRecord,
  nashville: propertyNashville as CityPropertyRecord,
  austin: propertyAustin as CityPropertyRecord,
  seattle: propertySeattle as CityPropertyRecord,
  nyc: propertyNyc as CityPropertyRecord,
  "san-francisco": propertySanFrancisco as CityPropertyRecord,
  detroit: propertyDetroit as CityPropertyRecord,
  "las-vegas": propertyLasVegas as CityPropertyRecord,
  "kansas-city": propertyKansasCity as CityPropertyRecord,
  columbus: propertyColumbus as CityPropertyRecord,
  boston: propertyBoston as CityPropertyRecord,
  "san-antonio": propertySanAntonio as CityPropertyRecord,
  milwaukee: propertyMilwaukee as CityPropertyRecord,
  charlotte: propertyCharlotte as CityPropertyRecord,
  denver: propertyDenver as CityPropertyRecord,
  "washington-dc": propertyWashingtonDc as CityPropertyRecord,
  philadelphia: propertyPhiladelphia as CityPropertyRecord,
  atlanta: propertyAtlanta as CityPropertyRecord,
  phoenix: propertyPhoenix as CityPropertyRecord,
  "los-angeles": propertyLosAngeles as CityPropertyRecord,
  "fort-worth": propertyFortWorth as CityPropertyRecord,
  mesa: propertyMesa as CityPropertyRecord,
  minneapolis: propertyMinneapolis as CityPropertyRecord,
  wichita: propertyWichita as CityPropertyRecord,
  cleveland: propertyCleveland as CityPropertyRecord,
  "new-orleans": propertyNewOrleans as CityPropertyRecord,
  orlando: propertyOrlando as CityPropertyRecord,
  cincinnati: propertyCincinnati as CityPropertyRecord,
  scottsdale: propertyScottsdale as CityPropertyRecord,
};

export const ZONING_CITIES: Record<string, CityZoningRecord> = {
  austin: zoningAustin as CityZoningRecord,
  dallas: zoningDallas as CityZoningRecord,
  nashville: zoningNashville as CityZoningRecord,
  denver: zoningDenver as CityZoningRecord,
  charlotte: zoningCharlotte as CityZoningRecord,
  boston: zoningBoston as CityZoningRecord,
  atlanta: zoningAtlanta as CityZoningRecord,
  "new-orleans": zoningNewOrleans as CityZoningRecord,
  tampa: zoningTampa as CityZoningRecord,
  indianapolis: zoningIndianapolis as CityZoningRecord,
  durham: zoningDurham as CityZoningRecord,
  "washington-dc": zoningWashingtonDc as CityZoningRecord,
  nyc: zoningNyc as CityZoningRecord,
  "los-angeles": zoningLosAngeles as CityZoningRecord,
  "fort-worth": zoningFortWorth as CityZoningRecord,
  raleigh: zoningRaleigh as CityZoningRecord,
  boise: zoningBoise as CityZoningRecord,
  orlando: zoningOrlando as CityZoningRecord,
  scottsdale: zoningScottsdale as CityZoningRecord,
};
