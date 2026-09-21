import { describe, expect, it } from "vitest";
import {
  JOB_CLASSES,
  JOB_TYPES,
  SITE_WALK_CLASSES,
  allowsEmptyFenceAndMaterials,
  allowsZeroHourLabor,
  classesForJobType,
  isJobType,
  mapImportJobType,
  normalizeJobType,
} from "./job-constants";
import { computeOnHand, inventorySignForJobType } from "./inventory";
import { jobTypeGroup } from "./analytics";
import { emptyJobFormValues, validateAndNormalize } from "./job-form";

describe("JOB_TYPES", () => {
  it("exposes the Title Case labels including Site Walk", () => {
    expect([...JOB_TYPES]).toEqual(["Install", "Pickup", "Drop", "Other", "Site Walk"]);
  });
});

describe("normalizeJobType", () => {
  it("keeps canonical labels", () => {
    expect(normalizeJobType("Install")).toBe("Install");
    expect(normalizeJobType("Pickup")).toBe("Pickup");
    expect(normalizeJobType("Drop")).toBe("Drop");
    expect(normalizeJobType("Other")).toBe("Other");
    expect(normalizeJobType("Site Walk")).toBe("Site Walk");
  });

  it("title-cases the known labels", () => {
    expect(normalizeJobType("install")).toBe("Install");
    expect(normalizeJobType(" PICKUP ")).toBe("Pickup");
    expect(normalizeJobType("DROP")).toBe("Drop");
    expect(normalizeJobType("other")).toBe("Other");
    expect(normalizeJobType("site walk")).toBe("Site Walk");
    expect(normalizeJobType(" SITE WALK ")).toBe("Site Walk");
  });

  it("does not map former codes INST / PU / DELIVERY / RETURN", () => {
    expect(normalizeJobType("INST")).toBe("INST");
    expect(normalizeJobType("PU")).toBe("PU");
    expect(normalizeJobType("PICK-UP")).toBe("PICK-UP");
    expect(normalizeJobType("RETURN")).toBe("RETURN");
    expect(normalizeJobType("RET")).toBe("RET");
    expect(normalizeJobType("DELIVERY")).toBe("DELIVERY");
    expect(normalizeJobType("DEL")).toBe("DEL");
    expect(isJobType("INST")).toBe(false);
    expect(isJobType("PU")).toBe(false);
    expect(isJobType("DELIVERY")).toBe(false);
  });

  it("leaves unknown values trimmed", () => {
    expect(normalizeJobType(" RELOCATE ")).toBe("RELOCATE");
    expect(isJobType("RELOCATE")).toBe(false);
  });
});

describe("mapImportJobType", () => {
  it("maps canonical labels case-insensitively", () => {
    expect(mapImportJobType("Install")).toEqual({
      ok: true,
      original: "Install",
      mapped: "Install",
    });
    expect(mapImportJobType(" pickup ")).toEqual({
      ok: true,
      original: "pickup",
      mapped: "Pickup",
    });
    expect(mapImportJobType("DROP")).toEqual({ ok: true, original: "DROP", mapped: "Drop" });
    expect(mapImportJobType("other")).toEqual({ ok: true, original: "other", mapped: "Other" });
    expect(mapImportJobType("Site Walk")).toEqual({
      ok: true,
      original: "Site Walk",
      mapped: "Site Walk",
    });
  });

  it("maps known Daily Tracker aliases", () => {
    expect(mapImportJobType("INST").mapped).toBe("Install");
    expect(mapImportJobType("INSTALL").mapped).toBe("Install");
    expect(mapImportJobType("PU").mapped).toBe("Pickup");
    expect(mapImportJobType("PICK-UP").mapped).toBe("Pickup");
    expect(mapImportJobType("pick up").mapped).toBe("Pickup");
    expect(mapImportJobType("RETURN").mapped).toBe("Pickup");
    expect(mapImportJobType("RET").mapped).toBe("Pickup");
    expect(mapImportJobType("DELIVERY").mapped).toBe("Drop");
    expect(mapImportJobType("DEL").mapped).toBe("Drop");
    expect(mapImportJobType("OTHER").mapped).toBe("Other");
    expect(mapImportJobType("SITE WALK").mapped).toBe("Site Walk");
    expect(mapImportJobType("SITE-WALK").mapped).toBe("Site Walk");
    expect(mapImportJobType("SITEWALK").mapped).toBe("Site Walk");
    expect(mapImportJobType("site_walk").mapped).toBe("Site Walk");
  });

  it("rejects unknown codes instead of coercing to Other", () => {
    for (const code of ["SWLK", "RELOCATE", "REP", "MOVE", "MISC", ""]) {
      const result = mapImportJobType(code);
      expect(result.ok).toBe(false);
      expect(result.mapped).toBeNull();
      expect(result.mapped).not.toBe("Other");
    }
    const blank = mapImportJobType("");
    expect(blank.ok).toBe(false);
    if (!blank.ok) expect(blank.reason).toMatch(/required/i);
    const unknown = mapImportJobType("SWLK");
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reason).toMatch(/not coerced to Other/);
  });
});

describe("inventorySignForJobType", () => {
  it("Install and Drop are outbound", () => {
    expect(inventorySignForJobType("Install")).toBe(-1);
    expect(inventorySignForJobType("Drop")).toBe(-1);
    expect(inventorySignForJobType("install")).toBe(-1);
  });

  it("Pickup is inbound", () => {
    expect(inventorySignForJobType("Pickup")).toBe(1);
    expect(inventorySignForJobType("pickup")).toBe(1);
  });

  it("Other, Site Walk, and unrecognized strings have no inventory effect", () => {
    expect(inventorySignForJobType("Other")).toBe(0);
    expect(inventorySignForJobType("Site Walk")).toBe(0);
    expect(inventorySignForJobType("site walk")).toBe(0);
    expect(inventorySignForJobType("INST")).toBe(0);
    expect(inventorySignForJobType("PU")).toBe(0);
    expect(inventorySignForJobType("DELIVERY")).toBe(0);
    expect(inventorySignForJobType("RETURN")).toBe(0);
    expect(inventorySignForJobType("RELOCATE")).toBe(0);
  });

  it("does not change BOM-style quantities, only the sign on on-hand", () => {
    const items = [
      {
        id: "panel",
        sku: "PANEL-6",
        name: "6ft Panel",
        unit: "ea",
        reusable: true,
        branchId: "mia",
        startingQty: 100,
        unitCost: 10,
        branch: { code: "MIA", name: "Miami" },
      },
    ];
    const qty = 10;
    const install = computeOnHand({
      items,
      materials: [
        {
          inventoryItemId: "panel",
          quantity: qty,
          job: { jobType: "Install", branchId: "mia" },
        },
      ],
      adjustments: [],
    });
    const pickup = computeOnHand({
      items,
      materials: [
        {
          inventoryItemId: "panel",
          quantity: qty,
          job: { jobType: "Pickup", branchId: "mia" },
        },
      ],
      adjustments: [],
    });
    const drop = computeOnHand({
      items,
      materials: [
        {
          inventoryItemId: "panel",
          quantity: qty,
          job: { jobType: "Drop", branchId: "mia" },
        },
      ],
      adjustments: [],
    });
    const other = computeOnHand({
      items,
      materials: [
        {
          inventoryItemId: "panel",
          quantity: qty,
          job: { jobType: "Other", branchId: "mia" },
        },
      ],
      adjustments: [],
    });
    const siteWalk = computeOnHand({
      items,
      materials: [
        {
          inventoryItemId: "panel",
          quantity: qty,
          job: { jobType: "Site Walk", branchId: "mia" },
        },
      ],
      adjustments: [],
    });

    expect(install[0].movementQty).toBe(-qty);
    expect(install[0].onHand).toBe(90);
    expect(pickup[0].movementQty).toBe(qty);
    expect(pickup[0].onHand).toBe(110);
    expect(drop[0].movementQty).toBe(-qty);
    expect(other[0].movementQty).toBe(0);
    expect(other[0].onHand).toBe(100);
    expect(siteWalk[0].movementQty).toBe(0);
    expect(siteWalk[0].onHand).toBe(100);
  });
});

describe("jobTypeGroup", () => {
  it("groups outbound as Install and inbound as Pickup", () => {
    expect(jobTypeGroup("Install")).toBe("Install");
    expect(jobTypeGroup("Drop")).toBe("Install");
    expect(jobTypeGroup("Pickup")).toBe("Pickup");
    expect(jobTypeGroup("Other")).toBe("Other");
    expect(jobTypeGroup("Site Walk")).toBe("Other");
    expect(jobTypeGroup("INST")).toBe("Other");
    expect(jobTypeGroup("PU")).toBe("Other");
  });
});

describe("validateAndNormalize job type", () => {
  function base() {
    return {
      ...emptyJobFormValues({ branchId: "b1", date: "2026-03-05" }),
      orderNumber: "ORD-1",
    };
  }

  it("stores Title Case canonical labels", () => {
    const result = validateAndNormalize({ ...base(), jobType: "install" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.jobType).toBe("Install");
  });

  it("accepts each canonical type", () => {
    for (const jobType of JOB_TYPES) {
      const result = validateAndNormalize({ ...base(), jobType });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.jobType).toBe(jobType);
    }
  });

  it("rejects former codes and unknown types", () => {
    expect(validateAndNormalize({ ...base(), jobType: "INST" }).ok).toBe(false);
    expect(validateAndNormalize({ ...base(), jobType: "PU" }).ok).toBe(false);
    expect(validateAndNormalize({ ...base(), jobType: "DELIVERY" }).ok).toBe(false);
    expect(validateAndNormalize({ ...base(), jobType: "SWLK" }).ok).toBe(false);
  });

  it("normalizes post mount plate / driven / blank", () => {
    const plate = validateAndNormalize({ ...base(), postMount: "plate" });
    expect(plate.ok).toBe(true);
    if (plate.ok) expect(plate.data.postMount).toBe("plate");
    const driven = validateAndNormalize({ ...base(), postMount: "driven" });
    expect(driven.ok).toBe(true);
    if (driven.ok) expect(driven.data.postMount).toBe("driven");
    const blank = validateAndNormalize({ ...base(), postMount: "" });
    expect(blank.ok).toBe(true);
    if (blank.ok) expect(blank.data.postMount).toBe("driven");
    expect(validateAndNormalize({ ...base(), postMount: "welded" }).ok).toBe(false);
  });

  it("accepts multiple fence sections and denormalizes totals", () => {
    const result = validateAndNormalize({
      ...base(),
      sections: [
        {
          fenceType: "CL6",
          qtyLf: "100",
          topRail: false,
          bottomRail: false,
          weightMode: "",
          postMount: "driven",
          gateType: "5x6",
          gateQty: "1",
          gateType2: "",
          gateQty2: "0",
          terminalsManual: "2",
        },
        {
          fenceType: "6x10",
          qtyLf: "40",
          topRail: false,
          bottomRail: false,
          weightMode: "BFOOT",
          postMount: "driven",
          gateType: "6x6",
          gateQty: "1",
          gateType2: "",
          gateQty2: "0",
          terminalsManual: "0",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.fenceSections).toHaveLength(2);
    expect(result.data.qtyLf).toBe(140);
    expect(result.data.gates).toBe(2);
    expect(result.data.terminalsManual).toBe(2);
    expect(result.data.weightMode).toBe("BFOOT");
  });

  it("rejects negative LF and still allows blank / zero / positive", () => {
    const negative = validateAndNormalize({ ...base(), qtyLf: "-5" });
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.error).toMatch(/LF cannot be negative/i);

    expect(validateAndNormalize({ ...base(), qtyLf: "" }).ok).toBe(true);
    const zero = validateAndNormalize({ ...base(), qtyLf: "0" });
    expect(zero.ok).toBe(true);
    if (zero.ok) expect(zero.data.qtyLf).toBe(0);
    const positive = validateAndNormalize({ ...base(), qtyLf: "100" });
    expect(positive.ok).toBe(true);
    if (positive.ok) expect(positive.data.qtyLf).toBe(100);
  });
});

describe("job classes", () => {
  it("keeps EVENT / CONSTRUCTION / OTHER for existing types", () => {
    expect([...JOB_CLASSES]).toEqual(["EVENT", "CONSTRUCTION", "OTHER"]);
    for (const jobType of ["Install", "Pickup", "Drop", "Other"] as const) {
      expect(classesForJobType(jobType)).toEqual(JOB_CLASSES);
    }
  });

  it("uses Non Pay and Site Visit only for Site Walk", () => {
    expect([...SITE_WALK_CLASSES]).toEqual(["Non Pay", "Site Visit"]);
    expect(classesForJobType("Site Walk")).toEqual(SITE_WALK_CLASSES);
    expect(classesForJobType("site walk")).toEqual(SITE_WALK_CLASSES);
  });
});

describe("validateAndNormalize Site Walk", () => {
  function base() {
    return {
      ...emptyJobFormValues({ branchId: "b1", date: "2026-03-05" }),
      orderNumber: "ORD-SW",
    };
  }

  const emptyMaterialRow = {
    inventoryItemId: null,
    itemName: null,
    quantity: 1,
    notes: null,
  };

  it("saves with no fence type, no materials, and no labor", () => {
    for (const jobClass of SITE_WALK_CLASSES) {
      const result = validateAndNormalize({
        ...base(),
        jobType: "Site Walk",
        class: jobClass,
        fenceType: "",
        qtyLf: "",
        materials: [emptyMaterialRow],
        labor: [],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.jobType).toBe("Site Walk");
      expect(result.data.class).toBe(jobClass);
      expect(result.data.fenceType).toBeNull();
      expect(result.data.materials).toEqual([]);
      expect(result.data.labor).toEqual([]);
      expect(result.data.revenue).toBe(0);
    }
  });

  it("keeps a 0-hour labor row when an employee is selected", () => {
    expect(allowsZeroHourLabor("Site Walk")).toBe(true);
    const result = validateAndNormalize({
      ...base(),
      jobType: "Site Walk",
      class: "Non Pay",
      labor: [{ employeeId: "emp-1", regularHours: 0, overtimeHours: 0 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.labor).toEqual([
      { employeeId: "emp-1", regularHours: 0, overtimeHours: 0 },
    ]);
  });

  it("still skips 0-hour labor when no employee is selected", () => {
    const result = validateAndNormalize({
      ...base(),
      jobType: "Site Walk",
      labor: [{ employeeId: "  ", regularHours: 0, overtimeHours: 0 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.labor).toEqual([]);
  });
});

describe("validateAndNormalize existing job types (regression)", () => {
  function base(jobType: string) {
    return {
      ...emptyJobFormValues({ branchId: "b1", date: "2026-03-05" }),
      orderNumber: "ORD-1",
      jobType,
    };
  }

  const unnamedQty1 = {
    inventoryItemId: null as string | null,
    itemName: null as string | null,
    quantity: 1,
    notes: null as string | null,
  };

  it("still rejects unnamed non-zero material rows on Install / Pickup / Drop / Other", () => {
    for (const jobType of ["Install", "Pickup", "Drop", "Other"] as const) {
      expect(allowsEmptyFenceAndMaterials(jobType)).toBe(false);
      const result = validateAndNormalize({ ...base(jobType), materials: [unnamedQty1] });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/inventory item or a name/i);
    }
  });

  it("still drops 0-hour labor rows on Install / Pickup / Drop / Other", () => {
    for (const jobType of ["Install", "Pickup", "Drop", "Other"] as const) {
      expect(allowsZeroHourLabor(jobType)).toBe(false);
      const result = validateAndNormalize({
        ...base(jobType),
        labor: [{ employeeId: "emp-1", regularHours: 0, overtimeHours: 0 }],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.labor).toEqual([]);
    }
  });

  it("still keeps non-zero labor and named materials on Install", () => {
    const result = validateAndNormalize({
      ...base("Install"),
      materials: [
        { inventoryItemId: "item-1", itemName: null, quantity: 10, notes: null },
      ],
      labor: [{ employeeId: "emp-1", regularHours: 8, overtimeHours: 2 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.materials).toHaveLength(1);
    expect(result.data.labor).toEqual([
      { employeeId: "emp-1", regularHours: 8, overtimeHours: 2 },
    ]);
  });
});
