import { describe, expect, it } from "vitest";
import { JOB_TYPES } from "./job-constants";
import { dateOnlyToUtc } from "./job-form";
import {
  jobIsOnCalendarDay,
  jobVisibleOnJobsList,
  jobsListWhere,
  jobsOnCalendarDay,
  parseHideCancelled,
  type JobsListVisibilityJob,
} from "./jobs-list";

const DAY = "2026-04-11";
const OTHER_DAY = "2026-04-12";

function row(overrides: Partial<JobsListVisibilityJob> = {}): JobsListVisibilityJob {
  return {
    date: dateOnlyToUtc(DAY),
    branchId: "branch-mia",
    jobType: "Install",
    orderNumber: "ORD-1",
    customer: "Acme",
    city: "Miami",
    address: "1 Bay St",
    revenue: 1850,
    materialCount: 4,
    ...overrides,
  };
}

const siteWalkEmpty: JobsListVisibilityJob = row({
  jobType: "Site Walk",
  orderNumber: "ORD-SW",
  customer: "TBD",
  city: null,
  address: null,
  revenue: 0,
  materialCount: 0,
});

describe("jobsListWhere", () => {
  it("has no revenue, materials, labor, or fence predicates", () => {
    const where = jobsListWhere({
      from: DAY,
      to: DAY,
      branchId: "branch-mia",
      jobType: "Site Walk",
      q: "ORD",
    });
    const serialized = JSON.stringify(where);
    expect(serialized).not.toMatch(/revenue/i);
    expect(serialized).not.toMatch(/material/i);
    expect(serialized).not.toMatch(/labor/i);
    expect(serialized).not.toMatch(/fence/i);
    expect(where).not.toHaveProperty("revenue");
    expect(Object.keys(where).sort()).toEqual(["OR", "branchId", "date", "jobType"]);
  });

  it("unfiltered where is empty (every saved job, including $0 Site Walk and Cancelled)", () => {
    expect(jobsListWhere({})).toEqual({});
    expect(jobsListWhere({})).not.toHaveProperty("status");
  });

  it("same-day From/To is the calendar day list (UTC noon bounds)", () => {
    expect(jobsListWhere({ from: DAY, to: DAY })).toEqual({
      date: { gte: dateOnlyToUtc(DAY), lte: dateOnlyToUtc(DAY) },
    });
  });

  it("Hide cancelled adds a status predicate; default does not", () => {
    expect(jobsListWhere({ hideCancelled: true })).toEqual({
      status: { not: "Cancelled" },
    });
    expect(jobsListWhere({ from: DAY, to: DAY, hideCancelled: true })).toEqual({
      date: { gte: dateOnlyToUtc(DAY), lte: dateOnlyToUtc(DAY) },
      status: { not: "Cancelled" },
    });
    expect(parseHideCancelled(undefined)).toBe(false);
    expect(parseHideCancelled("")).toBe(false);
    expect(parseHideCancelled("1")).toBe(true);
    expect(parseHideCancelled("true")).toBe(true);
  });
});

describe("jobVisibleOnJobsList — Site Walk day confirmation", () => {
  it("shows Site Walk with $0, no materials, no city on the unfiltered Jobs list", () => {
    expect(jobVisibleOnJobsList(siteWalkEmpty, {})).toBe(true);
    expect(jobVisibleOnJobsList(siteWalkEmpty, { from: DAY, to: DAY })).toBe(true);
    expect(jobIsOnCalendarDay(siteWalkEmpty.date, DAY)).toBe(true);
    expect(jobsOnCalendarDay([siteWalkEmpty], DAY)).toEqual([siteWalkEmpty]);
  });

  it("does not hide Site Walk because revenue is 0 or materialCount is 0", () => {
    expect(
      jobVisibleOnJobsList(
        { ...siteWalkEmpty, revenue: 0, materialCount: 0 },
        { from: DAY, to: DAY }
      )
    ).toBe(true);
    expect(
      jobVisibleOnJobsList(
        { ...siteWalkEmpty, revenue: 500, materialCount: 3 },
        { from: DAY, to: DAY }
      )
    ).toBe(true);
  });

  it("includes Site Walk when filtering All types or Type=Site Walk", () => {
    expect(JOB_TYPES).toContain("Site Walk");
    expect(jobVisibleOnJobsList(siteWalkEmpty, { jobType: "" })).toBe(true);
    expect(jobVisibleOnJobsList(siteWalkEmpty, { jobType: "Site Walk" })).toBe(true);
    expect(jobVisibleOnJobsList(siteWalkEmpty, { jobType: "site walk" })).toBe(true);
  });

  it("stays off a different day's list and off Type=Install", () => {
    expect(jobVisibleOnJobsList(siteWalkEmpty, { from: OTHER_DAY, to: OTHER_DAY })).toBe(false);
    expect(jobIsOnCalendarDay(siteWalkEmpty.date, OTHER_DAY)).toBe(false);
    expect(jobVisibleOnJobsList(siteWalkEmpty, { jobType: "Install" })).toBe(false);
  });
});

describe("jobVisibleOnJobsList — existing types (regression)", () => {
  it("still shows Install / Pickup / Drop / Other on the unfiltered list and same-day list", () => {
    for (const jobType of ["Install", "Pickup", "Drop", "Other"] as const) {
      const job = row({ jobType, orderNumber: `ORD-${jobType}` });
      expect(jobVisibleOnJobsList(job, {})).toBe(true);
      expect(jobVisibleOnJobsList(job, { from: DAY, to: DAY })).toBe(true);
      expect(jobVisibleOnJobsList(job, { jobType })).toBe(true);
      expect(jobIsOnCalendarDay(job.date, DAY)).toBe(true);
    }
  });

  it("does not newly hide $0 / no-materials tickets for existing types", () => {
    const emptyInstall = row({
      jobType: "Install",
      revenue: 0,
      materialCount: 0,
    });
    const emptyOther = row({
      jobType: "Other",
      orderNumber: "ORD-OTH",
      revenue: 0,
      materialCount: 0,
    });
    expect(jobVisibleOnJobsList(emptyInstall, { from: DAY, to: DAY })).toBe(true);
    expect(jobVisibleOnJobsList(emptyOther, { from: DAY, to: DAY })).toBe(true);
    expect(jobsOnCalendarDay([emptyInstall, emptyOther, siteWalkEmpty], DAY)).toHaveLength(3);
  });

  it("Type=Install still excludes Pickup (same as before Site Walk)", () => {
    expect(jobVisibleOnJobsList(row({ jobType: "Pickup" }), { jobType: "Install" })).toBe(
      false
    );
    expect(jobVisibleOnJobsList(row({ jobType: "Install" }), { jobType: "Install" })).toBe(
      true
    );
  });
});

describe("jobVisibleOnJobsList — Cancelled", () => {
  const cancelledInstall: JobsListVisibilityJob = row({
    jobType: "Install",
    status: "Cancelled",
    orderNumber: "ORD-CXL",
    revenue: 4200,
    materialCount: 4,
  });

  it("shows Cancelled jobs on the unfiltered Jobs list and same-day list", () => {
    expect(jobVisibleOnJobsList(cancelledInstall, {})).toBe(true);
    expect(jobVisibleOnJobsList(cancelledInstall, { from: DAY, to: DAY })).toBe(true);
    expect(jobIsOnCalendarDay(cancelledInstall.date, DAY)).toBe(true);
    expect(jobsOnCalendarDay([cancelledInstall], DAY)).toEqual([cancelledInstall]);
  });

  it("Hide cancelled omits them; Active Install still shows", () => {
    expect(jobVisibleOnJobsList(cancelledInstall, { hideCancelled: true })).toBe(false);
    expect(
      jobVisibleOnJobsList(cancelledInstall, { from: DAY, to: DAY, hideCancelled: true })
    ).toBe(false);
    expect(jobVisibleOnJobsList(row({ jobType: "Install" }), { hideCancelled: true })).toBe(
      true
    );
  });

  it("missing status is treated as Active (visible even with Hide cancelled)", () => {
    expect(jobVisibleOnJobsList(row({ status: undefined }), { hideCancelled: true })).toBe(
      true
    );
  });
});
