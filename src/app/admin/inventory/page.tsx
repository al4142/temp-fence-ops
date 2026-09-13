import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeOnHand } from "@/lib/inventory";
import { InventoryAdminClient } from "@/components/InventoryAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const [branches, items, materials, adjustments, recentAdjustments] = await Promise.all([
    prisma.branch.findMany({ orderBy: [{ active: "desc" }, { code: "asc" }] }),
    prisma.inventoryItem.findMany({
      include: { branch: true },
      orderBy: [{ branch: { code: "asc" } }, { sku: "asc" }],
    }),
    prisma.jobMaterial.findMany({
      include: { job: { select: { jobType: true, branchId: true } } },
    }),
    prisma.inventoryAdjustment.findMany(),
    prisma.inventoryAdjustment.findMany({
      take: 25,
      orderBy: { adjustedAt: "desc" },
      include: {
        inventoryItem: { select: { sku: true, name: true } },
        branch: { select: { code: true } },
      },
    }),
  ]);

  const rows = computeOnHand({ items, materials, adjustments });
  const onHandById: Record<
    string,
    { itemId: string; onHand: number; movementQty: number; adjustmentQty: number }
  > = {};
  for (const r of rows) {
    onHandById[r.itemId] = {
      itemId: r.itemId,
      onHand: r.onHand,
      movementQty: r.movementQty,
      adjustmentQty: r.adjustmentQty,
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventory admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Catalog CRUD per branch, manual adjustments, and on-hand using the same math as{" "}
            <Link href="/inventory" className="text-blue-700 hover:underline">
              /inventory
            </Link>
            .
          </p>
        </div>
      </div>
      <InventoryAdminClient
        branches={branches}
        items={items}
        onHandById={onHandById}
        recentAdjustments={recentAdjustments.map((a) => ({
          id: a.id,
          quantityDelta: a.quantityDelta,
          reason: a.reason,
          adjustedAt: a.adjustedAt.toISOString(),
          inventoryItem: a.inventoryItem,
          branch: a.branch,
        }))}
      />
    </div>
  );
}
