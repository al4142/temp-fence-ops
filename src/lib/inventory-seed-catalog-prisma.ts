import { prisma } from "@/lib/prisma";
import {
  DAVIE_YARD_CODE,
  resolveDavieYard,
  type CatalogSeedCreateItem,
  type CatalogSeedSourceItem,
  type CatalogSeedYard,
  type SeedCatalogStore,
} from "@/lib/inventory-seed-catalog";

async function findYardById(id: string): Promise<CatalogSeedYard | null> {
  return prisma.branch.findUnique({
    where: { id },
    select: { id: true, code: true, name: true },
  });
}

async function findDavieYard(): Promise<CatalogSeedYard | null> {
  const byCode = await prisma.branch.findUnique({
    where: { code: DAVIE_YARD_CODE },
    select: { id: true, code: true, name: true },
  });
  if (byCode) return byCode;

  // Fallback when code was renamed but the yard is still clearly Davie by name.
  const candidates = await prisma.branch.findMany({
    where: {
      OR: [
        { name: { equals: "Davie", mode: "insensitive" } },
        { name: { startsWith: "Davie ", mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true, name: true },
    take: 20,
  });
  return resolveDavieYard(candidates);
}

async function listCatalogItems(yardId: string): Promise<CatalogSeedSourceItem[]> {
  return prisma.inventoryItem.findMany({
    where: { branchId: yardId },
    select: {
      sku: true,
      name: true,
      description: true,
      unit: true,
      reusable: true,
      unitCost: true,
      active: true,
    },
    orderBy: { sku: "asc" },
  });
}

async function listTargetSkus(yardId: string): Promise<string[]> {
  const rows = await prisma.inventoryItem.findMany({
    where: { branchId: yardId },
    select: { sku: true },
  });
  return rows.map((r) => r.sku);
}

async function createCatalogItems(items: CatalogSeedCreateItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const result = await prisma.inventoryItem.createMany({
    data: items.map((item) => ({
      sku: item.sku,
      name: item.name,
      description: item.description,
      unit: item.unit,
      reusable: item.reusable,
      unitCost: item.unitCost,
      active: item.active,
      startingQty: 0,
      branchId: item.branchId,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/** Prisma-backed store for seedCatalogFromYard / seedCatalogFromDavie. */
export function prismaSeedCatalogStore(): SeedCatalogStore {
  return {
    findYardById,
    findDavieYard,
    listCatalogItems,
    listTargetSkus,
    createCatalogItems,
  };
}
