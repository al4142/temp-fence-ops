/**
 * Seed a yard's inventory catalog from another yard (ALE-38).
 *
 * Copies catalog definitions only (SKU, name, unit, reusable, cost, …).
 * On-hand starts at qty 0 — never copies startingQty or inventory movements.
 * Idempotent by SKU: existing target SKUs are skipped.
 */

export const DAVIE_YARD_CODE = "DAV";

export type CatalogSeedYard = {
  id: string;
  code: string;
  name: string;
};

export type CatalogSeedSourceItem = {
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  reusable: boolean;
  unitCost: number;
  active: boolean;
};

export type CatalogSeedCreateItem = {
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  reusable: boolean;
  unitCost: number;
  active: boolean;
  /** Always 0 — empty stock, no quantity copied from the source yard. */
  startingQty: 0;
  branchId: string;
};

export type SeedCatalogResult =
  | {
      ok: true;
      created: number;
      skipped: number;
      sourceYardId: string;
      targetYardId: string;
    }
  | { ok: false; error: string };

export type SeedCatalogStore = {
  findYardById: (id: string) => Promise<CatalogSeedYard | null>;
  findDavieYard: () => Promise<CatalogSeedYard | null>;
  listCatalogItems: (yardId: string) => Promise<CatalogSeedSourceItem[]>;
  listTargetSkus: (yardId: string) => Promise<string[]>;
  createCatalogItems: (items: CatalogSeedCreateItem[]) => Promise<number>;
};

/** Prefer code DAV; fall back to a name that clearly identifies Davie. */
export function resolveDavieYard(
  yards: CatalogSeedYard[]
): CatalogSeedYard | null {
  const byCode = yards.find(
    (y) => y.code.trim().toUpperCase() === DAVIE_YARD_CODE
  );
  if (byCode) return byCode;

  const byName = yards.find((y) => {
    const name = y.name.trim().toLowerCase();
    return name === "davie" || name.startsWith("davie ");
  });
  return byName ?? null;
}

export function missingDavieYardError(): string {
  return `Davie yard (code ${DAVIE_YARD_CODE}) was not found. Create or restore Davie before seeding catalogs.`;
}

/**
 * Build create payloads for SKUs missing on the target yard.
 * Existing SKUs are skipped (case-insensitive). Source startingQty is ignored.
 */
export function planCatalogSeed(params: {
  sourceItems: CatalogSeedSourceItem[];
  existingTargetSkus: string[];
  targetYardId: string;
}): { toCreate: CatalogSeedCreateItem[]; skipped: number } {
  const existing = new Set(
    params.existingTargetSkus.map((s) => s.trim().toUpperCase()).filter(Boolean)
  );
  const toCreate: CatalogSeedCreateItem[] = [];
  let skipped = 0;

  for (const item of params.sourceItems) {
    const sku = item.sku.trim();
    if (!sku) {
      skipped += 1;
      continue;
    }
    const key = sku.toUpperCase();
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    toCreate.push({
      sku,
      name: item.name.trim() || sku,
      description: item.description?.trim() ? item.description.trim() : null,
      unit: item.unit.trim() || "ea",
      reusable: item.reusable,
      unitCost: Number.isFinite(item.unitCost) ? item.unitCost : 0,
      active: item.active,
      startingQty: 0,
      branchId: params.targetYardId,
    });
    existing.add(key);
  }

  return { toCreate, skipped };
}

export async function seedCatalogFromYard(
  store: SeedCatalogStore,
  sourceYardId: string,
  targetYardId: string
): Promise<SeedCatalogResult> {
  const sourceId = sourceYardId.trim();
  const targetId = targetYardId.trim();
  if (!sourceId || !targetId) {
    return { ok: false, error: "Source and target yards are required." };
  }
  if (sourceId === targetId) {
    return {
      ok: false,
      error: "Source and target yards must be different.",
    };
  }

  const source = await store.findYardById(sourceId);
  if (!source) return { ok: false, error: "Source yard not found." };
  const target = await store.findYardById(targetId);
  if (!target) return { ok: false, error: "Target yard not found." };

  const sourceItems = await store.listCatalogItems(sourceId);
  const existingSkus = await store.listTargetSkus(targetId);
  const { toCreate, skipped } = planCatalogSeed({
    sourceItems,
    existingTargetSkus: existingSkus,
    targetYardId: targetId,
  });

  const created =
    toCreate.length > 0 ? await store.createCatalogItems(toCreate) : 0;

  return {
    ok: true,
    created,
    skipped,
    sourceYardId: sourceId,
    targetYardId: targetId,
  };
}

export async function seedCatalogFromDavie(
  store: SeedCatalogStore,
  targetYardId: string
): Promise<SeedCatalogResult> {
  const davie = await store.findDavieYard();
  if (!davie) {
    return { ok: false, error: missingDavieYardError() };
  }
  return seedCatalogFromYard(store, davie.id, targetYardId.trim());
}
