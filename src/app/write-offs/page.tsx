import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { WriteOffClient } from "@/components/WriteOffClient";

export const dynamic = "force-dynamic";

export default async function WriteOffsPage() {
  const [branches, items, writeOffs] = await Promise.all([
    prisma.branch.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.inventoryItem.findMany({
      orderBy: [{ sku: "asc" }, { name: "asc" }],
      select: { id: true, sku: true, name: true, branchId: true },
    }),
    prisma.writeOff.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { branch: true, inventoryItem: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Write-offs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Damaged, scrap, or shrink reductions to on-hand inventory. Not included in job
          analytics.
        </p>
      </div>
      <WriteOffClient
        branches={branches}
        items={items}
        today={new Date().toISOString().slice(0, 10)}
        writeOffs={writeOffs.map((w) => ({
          id: w.id,
          date: formatDate(w.date),
          quantity: w.quantity,
          reason: w.reason,
          notes: w.notes,
          branch: { code: w.branch.code },
          inventoryItem: { sku: w.inventoryItem.sku, name: w.inventoryItem.name },
        }))}
      />
    </div>
  );
}
