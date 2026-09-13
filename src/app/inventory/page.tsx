import { prisma } from "@/lib/prisma";
import { computeOnHand } from "@/lib/inventory";
import { formatCurrency, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const sp = await searchParams;
  const branchFilter = sp.branch?.toUpperCase();

  const [branches, items, materials, adjustments] = await Promise.all([
    prisma.branch.findMany({ orderBy: { code: "asc" } }),
    prisma.inventoryItem.findMany({
      include: { branch: true },
      orderBy: [{ branch: { code: "asc" } }, { sku: "asc" }],
    }),
    prisma.jobMaterial.findMany({
      include: { job: { select: { jobType: true, branchId: true } } },
    }),
    prisma.inventoryAdjustment.findMany(),
  ]);

  let rows = computeOnHand({ items, materials, adjustments });
  if (branchFilter) {
    rows = rows.filter((r) => r.branchCode === branchFilter);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventory by branch</h1>
          <p className="mt-1 text-sm text-slate-600">
            On-hand = starting qty + job material movements (signed by job type) + manual
            adjustments. INST/DELIVERY reduce stock; PU/PICKUP increase it.
          </p>
        </div>
        <a
          href="/admin/inventory"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Manage catalog / adjustments
        </a>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterChip href="/inventory" active={!branchFilter} label="All" />
        {branches.map((b) => (
          <FilterChip
            key={b.id}
            href={`/inventory?branch=${b.code}`}
            active={branchFilter === b.code}
            label={`${b.code} - ${b.name}`}
          />
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium text-right">Starting</th>
              <th className="px-3 py-2 font-medium text-right">Moves</th>
              <th className="px-3 py-2 font-medium text-right">Adj</th>
              <th className="px-3 py-2 font-medium text-right">On hand</th>
              <th className="px-3 py-2 font-medium text-right">Unit cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.itemId} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{r.branchCode}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatNumber(r.startingQty, 0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.movementQty > 0 ? "+" : ""}
                  {formatNumber(r.movementQty, 0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.adjustmentQty > 0 ? "+" : ""}
                  {formatNumber(r.adjustmentQty, 0)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {formatNumber(r.onHand, 0)} {r.unit}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCurrency(r.unitCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={
        active
          ? "rounded-full bg-slate-900 px-3 py-1 text-white"
          : "rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }
    >
      {label}
    </a>
  );
}
