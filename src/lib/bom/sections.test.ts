import { describe, expect, it } from "vitest";
import {
  jobColumnsToStoredSection,
  parseStoredSections,
  sectionsForJob,
} from "./sections";

describe("parseStoredSections", () => {
  it("returns null for null, undefined, and empty values", () => {
    expect(parseStoredSections(null)).toBeNull();
    expect(parseStoredSections(undefined)).toBeNull();
    expect(parseStoredSections([])).toBeNull();
    expect(parseStoredSections("")).toBeNull();
    expect(parseStoredSections("   ")).toBeNull();
  });

  it("returns null instead of throwing on invalid JSON", () => {
    expect(parseStoredSections("{not-json")).toBeNull();
    expect(parseStoredSections("null")).toBeNull();
    expect(parseStoredSections({})).toBeNull();
    expect(parseStoredSections("{\"fenceType\":\"CL6\"}")).toBeNull();
  });

  it("parses a JSON string array", () => {
    const rows = parseStoredSections(
      JSON.stringify([{ fenceType: "CL6", qtyLf: 100, postMount: "plate", terminalsManual: 2 }])
    );
    expect(rows).toHaveLength(1);
    expect(rows?.[0].fenceType).toBe("CL6");
    expect(rows?.[0].qtyLf).toBe(100);
    expect(rows?.[0].postMount).toBe("plate");
    expect(rows?.[0].terminalsManual).toBe(2);
  });

  it("skips unusable rows and keeps valid ones", () => {
    const rows = parseStoredSections([null, "x", { fenceType: "CL8", qtyLf: 40 }]);
    expect(rows).toHaveLength(1);
    expect(rows?.[0].fenceType).toBe("CL8");
  });
});

describe("sectionsForJob", () => {
  it("maps null fenceSections to one legacy driven section", () => {
    const sections = sectionsForJob({
      fenceType: "CL6",
      qtyLf: 80,
      topRail: false,
      bottomRail: false,
      weightMode: null,
      gateType: "5x6",
      gateQty: 1,
      gateType2: null,
      gateQty2: 0,
      terminalsManual: 2,
    });
    expect(sections).toHaveLength(1);
    expect(sections[0].fenceType).toBe("CL6");
    expect(sections[0].qtyLf).toBe(80);
    expect(sections[0].postMount).toBe("driven");
    expect(sections[0].gateQty).toBe(1);
    expect(sections[0].terminalsManual).toBe(2);
  });

  it("does not throw when fenceSections is missing or unparsable", () => {
    expect(sectionsForJob(undefined)).toHaveLength(1);
    expect(sectionsForJob(null)).toHaveLength(1);
    expect(sectionsForJob({ fenceSections: "{bad" })).toHaveLength(1);
    expect(sectionsForJob({ fenceSections: { nope: true } })).toHaveLength(1);
    expect(jobColumnsToStoredSection({}).postMount).toBe("driven");
  });

  it("prefers stored JSON when present", () => {
    const sections = sectionsForJob({
      fenceType: "CL6",
      qtyLf: 10,
      fenceSections: [
        { fenceType: "CL6", qtyLf: 60, postMount: "driven" },
        { fenceType: "CL6", qtyLf: 40, postMount: "plate" },
      ],
    });
    expect(sections).toHaveLength(2);
    expect(sections[0].qtyLf).toBe(60);
    expect(sections[1].postMount).toBe("plate");
  });
});
