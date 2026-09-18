/**
 * Capability tests, run against the DATA THIS PACKAGE ACTUALLY SHIPS.
 *
 * The point of these is not the two-line accessor. It is that the reviewed
 * assertions survive the pipeline: they are authored in the urbankitstudio
 * registry, copied here by the atlas sync step, bundled into the published
 * package, and only then read by a consumer with no network access. Any link in
 * that chain can quietly drop a field, and a consumer would see "no restriction
 * recorded" rather than an error.
 */
import { describe, it, expect } from "vitest";
import { findCounty } from "../src/findCounty.js";
import { reviewedCapability, isReviewedUnservable } from "../src/capability.js";
import { atlas } from "../src/data.js";
import type { CountyRecord } from "../src/types.js";

describe("reviewed capability survives into the published bundle", () => {
  it("carries San Bernardino's owner-name restriction, attributed and cited", () => {
    const county = findCounty("california", "san-bernardino-county");
    expect(county, "San Bernardino missing from the bundled atlas").toBeTruthy();

    const owner = reviewedCapability(county!, "owner_name");
    expect(owner, "the reviewed record did not survive the sync into this package").toBeTruthy();
    expect(owner!.status).toBe("restricted");
    expect(owner!.basis.type).toBe("county_cited_statute");
    // Attribution is the load-bearing part: the county makes this claim, we report it.
    expect(owner!.basis.attributedTo).toBe("San Bernardino County");
    expect(owner!.basis.citation).toContain("7928.205");
    expect(owner!.lawfulAlternativeUrl).toBeTruthy();
  });

  it("tells a consumer not to promise the field", () => {
    const county = findCounty("california", "san-bernardino-county")!;
    expect(isReviewedUnservable(county, "owner_name")).toBe(true);
    // ...and says nothing about a field nobody reviewed, rather than guessing.
    expect(isReviewedUnservable(county, "apn")).toBe(false);
    expect(reviewedCapability(county, "apn")).toBeNull();
  });

  it("returns null rather than throwing for a county with no reviewed records", () => {
    // Los Angeles publishes no owner column and carries no reviewed record; the
    // fallback for it is derived, not reviewed. (San Diego played this part until
    // 2026-09-03, when its move to the county layer added a reviewed record.)
    const county = findCounty("california", "los-angeles-county");
    expect(county).toBeTruthy();
    expect(reviewedCapability(county!, "owner_name")).toBeNull();
    expect(isReviewedUnservable(county!, "owner_name")).toBe(false);
  });

  it("San Diego: the reviewed not_published record survives into the bundle", () => {
    const county = findCounty("california", "san-diego-county");
    expect(county).toBeTruthy();
    const record = reviewedCapability(county!, "owner_name");
    expect(record?.status).toBe("not_published");
    expect(record?.basis?.type).toBe("endpoint_schema");
    expect(isReviewedUnservable(county!, "owner_name")).toBe(true);
  });
});

describe("every reviewed record in the bundle is well formed", () => {
  it("never asserts a restriction without a citation or an attribution", () => {
    // The same rule the source registry enforces at build time. Asserted again
    // here because this package is what a consumer installs: a record that lost
    // its citation somewhere in the sync would be an unsourced legal claim
    // shipped to third parties.
    const counties: CountyRecord[] = [...atlas.byStateSlug.values()].flatMap((s) => s.counties);
    expect(counties.length, "the bundled atlas did not load").toBeGreaterThan(100);

    let reviewedCount = 0;
    for (const county of counties) {
      for (const [field, entry] of Object.entries(county.capabilityOverrides ?? {})) {
        reviewedCount++;
        expect(entry.basis, `${county.countySlug}/${field} has no basis`).toBeTruthy();
        expect(entry.basis.note.length, `${county.countySlug}/${field} note too short`).toBeGreaterThan(20);
        if (entry.status === "restricted") {
          expect(
            Boolean(entry.basis.citation) || Boolean(entry.basis.attributedTo),
            `${county.countySlug}/${field} claims restricted with neither citation nor attribution`,
          ).toBe(true);
        }
        if (entry.basis.type === "county_cited_statute") {
          expect(
            entry.basis.attributedTo,
            `${county.countySlug}/${field} repeats a county's citation without naming the county`,
          ).toBeTruthy();
        }
      }
    }
    // Guards the guard: if the sync ever ships zero reviewed records, the loop
    // above passes vacuously and this line is what notices.
    expect(reviewedCount, "no reviewed capability records in the bundle at all").toBeGreaterThan(0);
  });
});
