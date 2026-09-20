import { describe, expect, it } from "vitest";
import { emptyJobFormValues, validateAndNormalize } from "./job-form";
import {
  collectJobInventoryItemIds,
  validateInventoryItemsForJobYard,
} from "./inventory-yard";

/** Demo yards: same SKU on both (seed PANEL-6 / CLAMP-SET). */
const MIA = "branch-mia";
const DAV = "branch-dav";

const miaPanel = {
  id: "item-mia-panel-6",
  sku: "PANEL-6",
  name: "6ft Temp Fence Panel",
  branchId: MIA,
};
const davPanel = {
  id: "item-dav-panel-6",
  sku: "PANEL-6",
  name: "6ft Temp Fence Panel",
  branchId: DAV,
};
const davClamp = {
  id: "item-dav-clamp",
  sku: "CLAMP-SET",
  name: "Clamp Set",
  branchId: DAV,
};

/**
 * Payload that used to slip through:
 * - validateAndNormalize only checks ID/qty (no yard)
 * - old assertInventoryItemsExist only counted IDs (`found.length === unique.length`)
 * Miami job + Davie PANEL-6 material + Davie CLAMP-SET variance would write and
 * move Davie on-hand.
 */
const CROSS_YARD_SLIP_FIXTURE = {
  jobBranchId: MIA,
  materials: [
    {
      inventoryItemId: davPanel.id,
      itemName: null,
      quantity: 12,
      notes: null,
    },
  ],
  variances: [
    {
      inventoryItemId: davClamp.id,
      itemName: null,
      quantity: -2,
      reason: "damaged on site",
      notes: null,
    },
  ],
  foundItems: [davPanel, davClamp],
};

function formBase() {
  return {
    ...emptyJobFormValues({ branchId: MIA, date: "2026-03-05" }),
    orderNumber: "ORD-YARD-1",
  };
}

describe("collectJobInventoryItemIds", () => {
  it("collects material and variance catalog IDs and skips free-text", () => {
    expect(
      collectJobInventoryItemIds({
        materials: [
          { inventoryItemId: miaPanel.id },
          { inventoryItemId: null },
          { inventoryItemId: "  " },
        ],
        variances: [{ inventoryItemId: davClamp.id }, { inventoryItemId: "" }],
      })
    ).toEqual([miaPanel.id, davClamp.id]);
  });
});

describe("validateInventoryItemsForJobYard", () => {
  it("accepts same-yard materials", () => {
    const result = validateInventoryItemsForJobYard({
      requestedIds: [miaPanel.id],
      foundItems: [miaPanel],
      jobBranchId: MIA,
    });
    expect(result).toEqual({ ok: true });
  });

  it("accepts same-yard variances", () => {
    const result = validateInventoryItemsForJobYard({
      requestedIds: [miaPanel.id],
      foundItems: [miaPanel],
      jobBranchId: MIA,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts free-text lines with no catalog IDs", () => {
    const result = validateInventoryItemsForJobYard({
      requestedIds: collectJobInventoryItemIds({
        materials: [{ inventoryItemId: null }],
        variances: [{ inventoryItemId: "" }],
      }),
      foundItems: [],
      jobBranchId: MIA,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects cross-yard material stock", () => {
    const result = validateInventoryItemsForJobYard({
      requestedIds: [davPanel.id],
      foundItems: [davPanel],
      jobBranchId: MIA,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("PANEL-6");
    expect(result.error).toMatch(/different yard/i);
    expect(result.error).toMatch(/job's yard/i);
  });

  it("rejects cross-yard variance stock", () => {
    const result = validateInventoryItemsForJobYard({
      requestedIds: [davClamp.id],
      foundItems: [davClamp],
      jobBranchId: MIA,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("CLAMP-SET");
  });

  it("rejects the slip-through fixture: IDs exist, count matches, yards do not", () => {
    const requestedIds = collectJobInventoryItemIds(CROSS_YARD_SLIP_FIXTURE);
    const unique = [...new Set(requestedIds)];
    // Old existence-only gate: all IDs were found.
    expect(CROSS_YARD_SLIP_FIXTURE.foundItems).toHaveLength(unique.length);
    expect(
      unique.every((id) =>
        CROSS_YARD_SLIP_FIXTURE.foundItems.some((item) => item.id === id)
      )
    ).toBe(true);

    const parsed = validateAndNormalize({
      ...formBase(),
      materials: CROSS_YARD_SLIP_FIXTURE.materials,
      variances: CROSS_YARD_SLIP_FIXTURE.variances,
    });
    expect(parsed.ok).toBe(true);

    const result = validateInventoryItemsForJobYard({
      requestedIds,
      foundItems: CROSS_YARD_SLIP_FIXTURE.foundItems,
      jobBranchId: CROSS_YARD_SLIP_FIXTURE.jobBranchId,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("PANEL-6");
    expect(result.error).toContain("CLAMP-SET");
    expect(result.error).toMatch(/different yard/i);
  });

  it("rejects mixed same-yard + cross-yard lines", () => {
    const result = validateInventoryItemsForJobYard({
      requestedIds: [miaPanel.id, davPanel.id],
      foundItems: [miaPanel, davPanel],
      jobBranchId: MIA,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("PANEL-6");
    expect(result.error).not.toMatch(/were not found/i);
  });

  it("fails closed when a requested ID is missing from found items", () => {
    const result = validateInventoryItemsForJobYard({
      requestedIds: [miaPanel.id, "item-ghost"],
      foundItems: [miaPanel],
      jobBranchId: MIA,
    });
    expect(result).toEqual({
      ok: false,
      error: "One or more inventory items were not found.",
    });
  });

  it("fails closed when the job has no branch", () => {
    const result = validateInventoryItemsForJobYard({
      requestedIds: [miaPanel.id],
      foundItems: [miaPanel],
      jobBranchId: "",
    });
    expect(result).toEqual({ ok: false, error: "Branch is required." });
  });
});
