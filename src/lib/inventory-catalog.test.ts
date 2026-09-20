import { describe, expect, it } from "vitest";
import { emptyJobFormValues, validateAndNormalize } from "./job-form";
import { collectJobInventoryItemIds } from "./inventory-yard";
import {
  catalogIsInUse,
  catalogLineDisplayName,
  catalogItemsForJobPicker,
  catalogUsageTotal,
  describeCatalogUsage,
  emptyCatalogUsage,
  hardDeleteBlockedMessage,
  validateCatalogItemsForJobAttach,
} from "./inventory-catalog";

const MIA = "branch-mia";

const activePanel = {
  id: "item-mia-panel-6",
  sku: "PANEL-6",
  name: "6ft Temp Fence Panel",
  active: true,
};

const inactivePanel = {
  ...activePanel,
  active: false,
};

const inactiveClamp = {
  id: "item-mia-clamp",
  sku: "CLAMP-SET",
  name: "Clamp Set",
  active: false,
};

const unused: ReturnType<typeof emptyCatalogUsage> = emptyCatalogUsage();

const jobMaterialUsage = {
  ...emptyCatalogUsage(),
  materials: 2,
};

const adjustmentUsage = {
  ...emptyCatalogUsage(),
  adjustments: 3,
};

const transferUsage = {
  ...emptyCatalogUsage(),
  transfersFrom: 1,
  transfersTo: 1,
};

function formBase() {
  return {
    ...emptyJobFormValues({ branchId: MIA, date: "2026-03-05" }),
    orderNumber: "ORD-CAT-1",
  };
}

describe("catalog usage / hard-delete gate", () => {
  it("allows hard-delete only when unused (no job/transfer/write-off/adjustment refs)", () => {
    expect(catalogIsInUse(unused)).toBe(false);
    expect(catalogUsageTotal(unused)).toBe(0);
  });

  it("treats job materials as in-use and blocks hard-delete with a deactivate hint", () => {
    expect(catalogIsInUse(jobMaterialUsage)).toBe(true);
    const message = hardDeleteBlockedMessage({ sku: "PANEL-6", counts: jobMaterialUsage });
    expect(message).toContain("PANEL-6");
    expect(message).toContain("2 job material(s)");
    expect(message).toMatch(/deactivate/i);
    expect(message).toMatch(/history/i);
  });

  it("treats adjustments as in-use so delete cannot wipe on-hand history", () => {
    expect(catalogIsInUse(adjustmentUsage)).toBe(true);
    expect(hardDeleteBlockedMessage({ sku: "PANEL-6", counts: adjustmentUsage })).toContain(
      "3 adjustment(s)"
    );
  });

  it("counts transfer from+to, variances, and write-offs", () => {
    expect(catalogIsInUse(transferUsage)).toBe(true);
    expect(describeCatalogUsage(transferUsage)).toBe("2 transfer line(s)");

    const mixed = {
      ...emptyCatalogUsage(),
      variances: 1,
      writeOffs: 4,
    };
    expect(catalogIsInUse(mixed)).toBe(true);
    expect(describeCatalogUsage(mixed)).toBe("1 job variance(s), 4 write-off(s)");
  });
});

describe("validateCatalogItemsForJobAttach", () => {
  it("rejects attaching an inactive SKU to a new job", () => {
    const parsed = validateAndNormalize({
      ...formBase(),
      materials: [
        {
          inventoryItemId: inactivePanel.id,
          itemName: null,
          quantity: 10,
          notes: null,
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const requestedIds = collectJobInventoryItemIds(parsed.data);
    const result = validateCatalogItemsForJobAttach({
      requestedIds,
      foundItems: [inactivePanel],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("PANEL-6");
    expect(result.error).toMatch(/cannot be attached/i);
  });

  it("rejects newly attaching an inactive SKU that was not already on the job", () => {
    const result = validateCatalogItemsForJobAttach({
      requestedIds: [inactiveClamp.id],
      foundItems: [inactiveClamp],
      alreadyAttachedIds: [inactivePanel.id],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("CLAMP-SET");
    expect(result.error).not.toContain("PANEL-6");
  });

  it("allows historical jobs to keep an already-attached inactive SKU", () => {
    const result = validateCatalogItemsForJobAttach({
      requestedIds: [inactivePanel.id],
      foundItems: [inactivePanel],
      alreadyAttachedIds: [inactivePanel.id],
    });
    expect(result).toEqual({ ok: true });
  });

  it("allows active SKUs on new jobs", () => {
    const result = validateCatalogItemsForJobAttach({
      requestedIds: [activePanel.id],
      foundItems: [activePanel],
    });
    expect(result).toEqual({ ok: true });
  });

  it("fails closed when a requested ID is missing", () => {
    const result = validateCatalogItemsForJobAttach({
      requestedIds: [activePanel.id, "item-ghost"],
      foundItems: [activePanel],
    });
    expect(result).toEqual({
      ok: false,
      error: "One or more inventory items were not found.",
    });
  });
});

describe("historical job name after deactivate", () => {
  it("resolves the catalog name while the deactivated row remains", () => {
    expect(
      catalogLineDisplayName({
        itemName: null,
        inventoryItem: { name: inactivePanel.name },
      })
    ).toBe("6ft Temp Fence Panel");
  });

  it("falls back to free-text only when there is no catalog row", () => {
    expect(
      catalogLineDisplayName({
        itemName: "Custom panel",
        inventoryItem: null,
      })
    ).toBe("Custom panel");
  });
});

describe("catalogItemsForJobPicker", () => {
  it("hides inactive SKUs unless they are already attached", () => {
    const items = [
      { ...activePanel, branchId: MIA },
      { ...inactivePanel, id: "item-old", branchId: MIA },
    ];
    expect(catalogItemsForJobPicker(items).map((i) => i.id)).toEqual([activePanel.id]);
    expect(catalogItemsForJobPicker(items, ["item-old"]).map((i) => i.id)).toEqual([
      activePanel.id,
      "item-old",
    ]);
  });
});
