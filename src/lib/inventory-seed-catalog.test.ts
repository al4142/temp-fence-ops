import { describe, expect, it, vi } from "vitest";
import {
  DAVIE_YARD_CODE,
  missingDavieYardError,
  planCatalogSeed,
  resolveDavieYard,
  seedCatalogFromDavie,
  seedCatalogFromYard,
  type CatalogSeedCreateItem,
  type CatalogSeedSourceItem,
  type CatalogSeedYard,
  type SeedCatalogStore,
} from "./inventory-seed-catalog";

const DAVIE: CatalogSeedYard = {
  id: "yard-davie",
  code: "DAV",
  name: "Davie Yard",
};

const TARGET: CatalogSeedYard = {
  id: "yard-mul",
  code: "MUL",
  name: "MUL - MULLBERRY",
};

const SOURCE_ITEMS: CatalogSeedSourceItem[] = [
  {
    sku: "PANEL-6",
    name: "6ft Temp Fence Panel",
    description: "Standard panel",
    unit: "ea",
    reusable: true,
    unitCost: 45,
    active: true,
  },
  {
    sku: "CLAMP-SET",
    name: "Clamp Set",
    description: null,
    unit: "ea",
    reusable: true,
    unitCost: 3.5,
    active: true,
  },
  {
    sku: "AL-TIES",
    name: "ALUMINUM TIES",
    description: null,
    unit: "ea",
    reusable: false,
    unitCost: 0.05,
    active: true,
  },
];

function memoryStore(opts: {
  yards: CatalogSeedYard[];
  itemsByYard: Record<string, CatalogSeedSourceItem[]>;
}): SeedCatalogStore & {
  created: CatalogSeedCreateItem[];
  davieStartingSnapshot: () => CatalogSeedSourceItem[];
} {
  const itemsByYard: Record<string, CatalogSeedSourceItem[]> = Object.fromEntries(
    Object.entries(opts.itemsByYard).map(([id, items]) => [
      id,
      items.map((item) => ({ ...item })),
    ])
  );
  const created: CatalogSeedCreateItem[] = [];

  return {
    created,
    davieStartingSnapshot: () =>
      (itemsByYard[DAVIE.id] ?? []).map((item) => ({ ...item })),
    findYardById: async (id) => opts.yards.find((y) => y.id === id) ?? null,
    findDavieYard: async () => resolveDavieYard(opts.yards),
    listCatalogItems: async (yardId) =>
      (itemsByYard[yardId] ?? []).map((item) => ({ ...item })),
    listTargetSkus: async (yardId) =>
      (itemsByYard[yardId] ?? []).map((item) => item.sku),
    createCatalogItems: async (items) => {
      created.push(...items);
      const bucket = itemsByYard[items[0]?.branchId ?? ""] ?? [];
      for (const item of items) {
        bucket.push({
          sku: item.sku,
          name: item.name,
          description: item.description,
          unit: item.unit,
          reusable: item.reusable,
          unitCost: item.unitCost,
          active: item.active,
        });
      }
      itemsByYard[items[0]?.branchId ?? ""] = bucket;
      return items.length;
    },
  };
}

describe("resolveDavieYard", () => {
  it("identifies Davie by code DAV (not by id)", () => {
    const yards = [
      { id: "wrong-id", code: "MIA", name: "Miami Yard" },
      { id: "any-cuid", code: "DAV", name: "Davie Yard" },
    ];
    expect(resolveDavieYard(yards)).toEqual(yards[1]);
    expect(resolveDavieYard(yards)?.code).toBe(DAVIE_YARD_CODE);
  });

  it("falls back to a Davie name when code is missing", () => {
    const yards = [
      { id: "a", code: "MIA", name: "Miami Yard" },
      { id: "b", code: "XYZ", name: "Davie Yard" },
    ];
    expect(resolveDavieYard(yards)?.id).toBe("b");
  });

  it("returns null when Davie is absent", () => {
    expect(
      resolveDavieYard([{ id: "a", code: "MIA", name: "Miami Yard" }])
    ).toBeNull();
  });
});

describe("planCatalogSeed", () => {
  it("copies catalog fields with startingQty 0", () => {
    const { toCreate, skipped } = planCatalogSeed({
      sourceItems: SOURCE_ITEMS,
      existingTargetSkus: [],
      targetYardId: TARGET.id,
    });
    expect(skipped).toBe(0);
    expect(toCreate).toHaveLength(3);
    expect(toCreate.every((row) => row.startingQty === 0)).toBe(true);
    expect(toCreate.every((row) => row.branchId === TARGET.id)).toBe(true);
    expect(toCreate.map((r) => r.sku)).toEqual([
      "PANEL-6",
      "CLAMP-SET",
      "AL-TIES",
    ]);
    expect(toCreate[0]).toMatchObject({
      name: "6ft Temp Fence Panel",
      description: "Standard panel",
      unit: "ea",
      reusable: true,
      unitCost: 45,
      active: true,
    });
    expect(toCreate[2].reusable).toBe(false);
  });

  it("skips SKUs already on the target yard (case-insensitive, no dupes)", () => {
    const { toCreate, skipped } = planCatalogSeed({
      sourceItems: SOURCE_ITEMS,
      existingTargetSkus: ["panel-6", "AL-TIES"],
      targetYardId: TARGET.id,
    });
    expect(toCreate.map((r) => r.sku)).toEqual(["CLAMP-SET"]);
    expect(skipped).toBe(2);
  });
});

describe("seedCatalogFromYard", () => {
  it("seeds target SKUs at qty 0 and leaves Davie catalog unchanged", async () => {
    const store = memoryStore({
      yards: [DAVIE, TARGET],
      itemsByYard: {
        [DAVIE.id]: SOURCE_ITEMS,
        [TARGET.id]: [],
      },
    });
    const before = store.davieStartingSnapshot();

    const result = await seedCatalogFromYard(store, DAVIE.id, TARGET.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.created).toBe(3);
    expect(result.skipped).toBe(0);
    expect(store.created.every((row) => row.startingQty === 0)).toBe(true);
    expect(store.davieStartingSnapshot()).toEqual(before);
  });

  it("re-seed skips existing SKUs (idempotent, no duplicates)", async () => {
    const store = memoryStore({
      yards: [DAVIE, TARGET],
      itemsByYard: {
        [DAVIE.id]: SOURCE_ITEMS,
        [TARGET.id]: [SOURCE_ITEMS[0], SOURCE_ITEMS[1]],
      },
    });

    const first = await seedCatalogFromYard(store, DAVIE.id, TARGET.id);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.created).toBe(1);
    expect(first.skipped).toBe(2);
    expect(store.created.map((r) => r.sku)).toEqual(["AL-TIES"]);

    const second = await seedCatalogFromYard(store, DAVIE.id, TARGET.id);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(3);
    expect(store.created).toHaveLength(1);
  });

  it("rejects seeding a yard onto itself", async () => {
    const store = memoryStore({
      yards: [DAVIE],
      itemsByYard: { [DAVIE.id]: SOURCE_ITEMS },
    });
    const result = await seedCatalogFromYard(store, DAVIE.id, DAVIE.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/different/i);
  });
});

describe("seedCatalogFromDavie", () => {
  it("fails clearly when Davie yard is missing", async () => {
    const store = memoryStore({
      yards: [TARGET],
      itemsByYard: { [TARGET.id]: [] },
    });
    const findDavie = vi.spyOn(store, "findDavieYard");

    const result = await seedCatalogFromDavie(store, TARGET.id);
    expect(findDavie).toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(missingDavieYardError());
    expect(result.error).toContain(DAVIE_YARD_CODE);
    expect(store.created).toHaveLength(0);
  });

  it("resolves Davie by code and seeds the target", async () => {
    const store = memoryStore({
      yards: [DAVIE, TARGET],
      itemsByYard: {
        [DAVIE.id]: SOURCE_ITEMS,
        [TARGET.id]: [],
      },
    });
    const result = await seedCatalogFromDavie(store, TARGET.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(3);
    expect(result.sourceYardId).toBe(DAVIE.id);
  });
});
