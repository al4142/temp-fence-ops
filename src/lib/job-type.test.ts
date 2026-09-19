import { describe, expect, it } from "vitest";
import {
  JOB_TYPES,
  canonicalJobType,
  isJobType,
  normalizeJobType,
} from "./job-constants";
import { computeOnHand, inventorySignForJobType } from "./inventory";
import { jobTypeGroup } from "./analytics";
import { emptyJobFormValues, validateAndNormalize } from "./job-form";

describe("JOB_TYPES", () => {
  it("exposes only the four Title Case labels", () => {
    expect([...JOB_TYPES]).toEqual(["Install", "Pickup", "Drop", "Other"]);
  });
});

describe("normalizeJobType", () => {
  it("keeps canonical labels", () => {
    expect(normalizeJobType("Install")).toBe("Install");
    expect(normalizeJobType("Pickup")).toBe("Pickup");
    expect(normalizeJobType("Drop")).toBe("Drop");
    expect(normalizeJobType("Other")).toBe("Other");
  });

  it("title-cases the four known labels", () => {
    expect(normalizeJobType("install")).toBe("Install");
    expect(normalizeJobType(" PICKUP ")).toBe("Pickup");
    expect(normalizeJobType("DROP")).toBe("Drop");
    expect(normalizeJobType("other")).toBe("Other");
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

  it("canonicalJobType coerces unknown to Other", () => {
    expect(canonicalJobType("")).toBe("Other");
    expect(canonicalJobType("SWLK")).toBe("Other");
    expect(canonicalJobType("INST")).toBe("Other");
    expect(canonicalJobType("PU")).toBe("Other");
    expect(canonicalJobType("install")).toBe("Install");
    expect(canonicalJobType("Drop")).toBe("Drop");
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

  it("Other and unrecognized strings have no inventory effect", () => {
    expect(inventorySignForJobType("Other")).toBe(0);
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

    expect(install[0].movementQty).toBe(-qty);
    expect(install[0].onHand).toBe(90);
    expect(pickup[0].movementQty).toBe(qty);
    expect(pickup[0].onHand).toBe(110);
    expect(drop[0].movementQty).toBe(-qty);
    expect(other[0].movementQty).toBe(0);
    expect(other[0].onHand).toBe(100);
  });
});

describe("jobTypeGroup", () => {
  it("groups outbound as Install and inbound as Pickup", () => {
    expect(jobTypeGroup("Install")).toBe("Install");
    expect(jobTypeGroup("Drop")).toBe("Install");
    expect(jobTypeGroup("Pickup")).toBe("Pickup");
    expect(jobTypeGroup("Other")).toBe("Other");
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

  it("accepts each of the four types", () => {
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
});
