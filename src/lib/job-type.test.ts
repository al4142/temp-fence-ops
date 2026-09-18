import { describe, expect, it } from "vitest";
import {
  JOB_TYPES,
  canonicalJobType,
  isJobType,
  jobTypeQueryValues,
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

  it("title-cases known labels", () => {
    expect(normalizeJobType("install")).toBe("Install");
    expect(normalizeJobType(" PICKUP ")).toBe("Pickup");
  });

  it("maps legacy codes", () => {
    expect(normalizeJobType("INST")).toBe("Install");
    expect(normalizeJobType("INSTALL")).toBe("Install");
    expect(normalizeJobType("PU")).toBe("Pickup");
    expect(normalizeJobType("PICK-UP")).toBe("Pickup");
    expect(normalizeJobType("RETURN")).toBe("Pickup");
    expect(normalizeJobType("RET")).toBe("Pickup");
    expect(normalizeJobType("DELIVERY")).toBe("Drop");
    expect(normalizeJobType("DEL")).toBe("Drop");
    expect(normalizeJobType("OTHER")).toBe("Other");
  });

  it("leaves unknown values trimmed", () => {
    expect(normalizeJobType(" RELOCATE ")).toBe("RELOCATE");
    expect(isJobType("RELOCATE")).toBe(false);
  });

  it("canonicalJobType coerces unknown to Other", () => {
    expect(canonicalJobType("")).toBe("Other");
    expect(canonicalJobType("SWLK")).toBe("Other");
    expect(canonicalJobType("inst")).toBe("Install");
  });
});

describe("inventorySignForJobType", () => {
  it("Install and Drop are outbound", () => {
    expect(inventorySignForJobType("Install")).toBe(-1);
    expect(inventorySignForJobType("Drop")).toBe(-1);
    expect(inventorySignForJobType("INST")).toBe(-1);
    expect(inventorySignForJobType("DELIVERY")).toBe(-1);
    expect(inventorySignForJobType("DEL")).toBe(-1);
  });

  it("Pickup is inbound", () => {
    expect(inventorySignForJobType("Pickup")).toBe(1);
    expect(inventorySignForJobType("PU")).toBe(1);
    expect(inventorySignForJobType("PICKUP")).toBe(1);
    expect(inventorySignForJobType("RETURN")).toBe(1);
  });

  it("Other and unknown have no inventory effect", () => {
    expect(inventorySignForJobType("Other")).toBe(0);
    expect(inventorySignForJobType("OTHER")).toBe(0);
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
    expect(jobTypeGroup("DELIVERY")).toBe("Install");
    expect(jobTypeGroup("Pickup")).toBe("Pickup");
    expect(jobTypeGroup("PU")).toBe("Pickup");
    expect(jobTypeGroup("Other")).toBe("Other");
  });
});

describe("jobTypeQueryValues", () => {
  it("includes canonical plus legacy aliases", () => {
    expect(jobTypeQueryValues("Install")).toEqual(
      expect.arrayContaining(["Install", "INST", "INSTALL"])
    );
    expect(jobTypeQueryValues("Drop")).toEqual(
      expect.arrayContaining(["Drop", "DELIVERY", "DEL", "DROP"])
    );
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

  it("maps legacy INST on save", () => {
    const result = validateAndNormalize({ ...base(), jobType: "INST" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.jobType).toBe("Install");
  });

  it("rejects unknown types", () => {
    const result = validateAndNormalize({ ...base(), jobType: "SWLK" });
    expect(result.ok).toBe(false);
  });
});
