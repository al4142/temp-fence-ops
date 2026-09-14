import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { TransferClient } from "@/components/TransferClient";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const [branches, items, transfers] = await Promise.all([
    prisma.branch.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.inventoryItem.findMany({
      orderBy: [{ sku: "asc" }, { name: "asc" }],
      select: { id: true, sku: true, name: true, branchId: true, unit: true },
    }),
    prisma.transfer.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        fromBranch: true,
        toBranch: true,
        lines: { include: { fromInventoryItem: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Transfers</h1>
        <p className="mt-1 text-sm text-slate-600">
          Move inventory between yards. Matching SKU is created on the destination yard if
          missing (starting qty 0, unit cost copied). Not included in job analytics.
        </p>
      </div>
      <TransferClient
        branches={branches}
        items={items}
        today={new Date().toISOString().slice(0, 10)}
        transfers={transfers.map((t) => ({
          id: t.id,
          date: formatDate(t.date),
          notes: t.notes,
          fromBranch: { code: t.fromBranch.code },
          toBranch: { code: t.toBranch.code },
          lines: t.lines.map((l) => ({
            id: l.id,
            quantity: l.quantity,
            fromInventoryItem: {
              sku: l.fromInventoryItem.sku,
              name: l.fromInventoryItem.name,
            },
          })),
        }))}
      />
    </div>
  );
}
