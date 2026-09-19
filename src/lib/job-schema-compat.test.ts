import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  isMissingJobColumnError,
  JOB_LEGACY_SELECT,
  legacyJobReadArgs,
  stripOptionalJobFieldsFromData,
} from "./job-schema-compat";

describe("isMissingJobColumnError", () => {
  it("detects Prisma P2022 for fenceSections / postMount", () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      "The column `Job.fenceSections` does not exist in the current database.",
      { code: "P2022", clientVersion: "5.22.0", meta: { column: "Job.fenceSections" } }
    );
    expect(isMissingJobColumnError(err)).toBe(true);
  });

  it("detects raw Postgres missing-column text", () => {
    expect(
      isMissingJobColumnError(new Error('column "fenceSections" of relation "Job" does not exist'))
    ).toBe(true);
    expect(isMissingJobColumnError(new Error('column "postMount" does not exist'))).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMissingJobColumnError(new Error("connect ECONNREFUSED"))).toBe(false);
    expect(
      isMissingJobColumnError(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "5.22.0",
        })
      )
    ).toBe(false);
  });
});

describe("legacyJobReadArgs", () => {
  it("adds a select that omits fenceSections and postMount", () => {
    const next = legacyJobReadArgs({ where: { id: "j1" } });
    expect(next.where).toEqual({ id: "j1" });
    expect(next.select).toMatchObject(JOB_LEGACY_SELECT);
    expect(next.select).not.toHaveProperty("fenceSections");
    expect(next.select).not.toHaveProperty("postMount");
  });

  it("converts include to select so Prisma does not SELECT *", () => {
    const next = legacyJobReadArgs({
      include: { branch: true, _count: { select: { materials: true } } },
    });
    expect(next.include).toBeUndefined();
    expect(next.select).toMatchObject({
      ...JOB_LEGACY_SELECT,
      branch: true,
      _count: { select: { materials: true } },
    });
  });

  it("strips optional fields from an existing select", () => {
    const next = legacyJobReadArgs({
      select: { id: true, fenceSections: true, postMount: true, orderNumber: true },
    });
    expect(next.select).toEqual({ id: true, orderNumber: true });
  });
});

describe("stripOptionalJobFieldsFromData", () => {
  it("drops fenceSections and postMount so writes succeed on a legacy Job table", () => {
    expect(
      stripOptionalJobFieldsFromData({
        orderNumber: "1",
        postMount: "driven",
        fenceSections: [{ fenceType: "CL6" }],
      })
    ).toEqual({ orderNumber: "1" });
  });
});
