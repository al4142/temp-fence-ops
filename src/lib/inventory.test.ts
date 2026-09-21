import { describe, expect, it } from "vitest";
import { BOM_NAMES, BOM_SEED_ITEMS } from "./bom/catalog";
import {
  computeOnHand,
  inventorySignForJobType,
  inventorySignForMaterial,
} from "./inventory";

function seedByName(name: string) {
  const item = BOM_SEED_ITEMS.find((row) => row.name === name);
  if (!item) throw new Error(`Missing BOM seed item: ${name}`);
  return item;
}

function catalogOnHandItem(
  seed: (typeof BOM_SEED_ITEMS)[number],
  id: string,
  overrides: { startingQty?: number } = {}
) {
  return {
    id,
    sku: seed.sku,
    name: seed.name,
    unit: seed.unit,
    reusable: seed.reusable,
    branchId: "mia",
    startingQty: overrides.startingQty ?? seed.startingQty,
    unitCost: seed.unitCost,
    branch: { code: "MIA", name: "Miami" },
  };
}

function material(itemId: string, quantity: number, jobType: string) {
  return {
    inventoryItemId: itemId,
    quantity,
    job: { jobType, branchId: "mia" },
  };
}

const screwBolt = seedByName(BOM_NAMES.screwBolt38x3);
const platePost = seedByName(BOM_NAMES.cl6LinePostPlate);
const ties = seedByName(BOM_NAMES.ties);

describe("inventorySignForMaterial", () => {
  it("keeps job-type signs for reusable items", () => {
    expect(inventorySignForMaterial("Install", true)).toBe(-1);
    expect(inventorySignForMaterial("Drop", true)).toBe(-1);
    expect(inventorySignForMaterial("Pickup", true)).toBe(1);
    expect(inventorySignForMaterial("Other", true)).toBe(0);
    expect(inventorySignForMaterial("Site Walk", true)).toBe(0);
  });

  it("does not restock consumables on Pickup; outbound still decrements", () => {
    expect(inventorySignForMaterial("Pickup", false)).toBe(0);
    expect(inventorySignForMaterial("pickup", false)).toBe(0);
    expect(inventorySignForMaterial("Install", false)).toBe(-1);
    expect(inventorySignForMaterial("Drop", false)).toBe(-1);
    expect(inventorySignForMaterial("Other", false)).toBe(0);
    expect(inventorySignForMaterial("Site Walk", false)).toBe(0);
  });

  it("defaults missing reusable to true (Prisma default)", () => {
    expect(inventorySignForMaterial("Pickup")).toBe(1);
    expect(inventorySignForMaterial("Install")).toBe(-1);
  });

  it("does not change job-type grouping signs", () => {
    expect(inventorySignForJobType("Pickup")).toBe(1);
    expect(inventorySignForJobType("Install")).toBe(-1);
  });
});

describe("computeOnHand reusable flag", () => {
  it("restocks reusable items on Pickup", () => {
    const items = [catalogOnHandItem(platePost, "plate", { startingQty: 80 })];
    const rows = computeOnHand({
      items,
      materials: [material("plate", 10, "Pickup")],
      adjustments: [],
    });
    expect(platePost.reusable).toBe(true);
    expect(rows[0].movementQty).toBe(10);
    expect(rows[0].onHand).toBe(90);
  });

  it("does not restock consumables on Pickup", () => {
    const items = [catalogOnHandItem(screwBolt, "bolt", { startingQty: 800 })];
    const rows = computeOnHand({
      items,
      materials: [material("bolt", 28, "Pickup")],
      adjustments: [],
    });
    expect(screwBolt.reusable).toBe(false);
    expect(screwBolt.sku).toBe("SCREW-BOLT-3-8x3");
    expect(screwBolt.name).toBe(BOM_NAMES.screwBolt38x3);
    expect(rows[0].movementQty).toBe(0);
    expect(rows[0].onHand).toBe(800);
  });

  it("still decrements consumables on Install and Drop", () => {
    const items = [catalogOnHandItem(screwBolt, "bolt", { startingQty: 800 })];
    const install = computeOnHand({
      items,
      materials: [material("bolt", 28, "Install")],
      adjustments: [],
    });
    const drop = computeOnHand({
      items,
      materials: [material("bolt", 28, "Drop")],
      adjustments: [],
    });
    expect(install[0].movementQty).toBe(-28);
    expect(install[0].onHand).toBe(772);
    expect(drop[0].movementQty).toBe(-28);
    expect(drop[0].onHand).toBe(772);
  });

  it("Install then Pickup: reusable returns to start; SCREW-BOLT+ stays consumed", () => {
    const items = [
      catalogOnHandItem(platePost, "plate", { startingQty: 80 }),
      catalogOnHandItem(screwBolt, "bolt", { startingQty: 800 }),
    ];
    const qty = 28;
    const rows = computeOnHand({
      items,
      materials: [
        material("plate", qty, "Install"),
        material("bolt", qty, "Install"),
        material("plate", qty, "Pickup"),
        material("bolt", qty, "Pickup"),
      ],
      adjustments: [],
    });
    const byId = Object.fromEntries(rows.map((r) => [r.itemId, r]));
    expect(byId.plate.onHand).toBe(80);
    expect(byId.plate.movementQty).toBe(0);
    expect(byId.bolt.onHand).toBe(800 - qty);
    expect(byId.bolt.movementQty).toBe(-qty);
  });

  it("applies the reusable flag generically (ties also stay consumed)", () => {
    const items = [catalogOnHandItem(ties, "ties", { startingQty: 8000 })];
    expect(ties.reusable).toBe(false);
    const rows = computeOnHand({
      items,
      materials: [material("ties", 100, "Install"), material("ties", 100, "Pickup")],
      adjustments: [],
    });
    expect(rows[0].onHand).toBe(7900);
    expect(rows[0].movementQty).toBe(-100);
  });
});
