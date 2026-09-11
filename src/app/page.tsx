import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatNumber } from "@/lib/format";
import { computeOnHand } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [jobCount, branchCount, employeeCount, recentJobs, items, materials, adjustments] =
    await Promise.all([
      prisma.job.count(),
      prisma.branch.count(),
      prisma.employee.count(),
      prisma.job.findMany({
        take: 5,
        orderBy: { date: "desc" },
        include: { branch: true },
      }),
      prisma.inventoryItem.findMany({ include: { branch: true } }),
      prisma.jobMaterial.findMany({
        include: { job: { select: { jobType: true, branchId: true } } },
      }),
      prisma.inventoryAdjustment.findMany(),
    ]);

  const onHand = computeOnHand({ items, materials, adjustments });
  const lowStock = onHand.filter((r) => r.onHand < r.startingQty * 0.85).slice(0, 5);
  const revenue = await prisma.job.aggregate({ _sum: { revenue: true } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Operations dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Public demo with fake sample data. Replaces the Excel daily tracker, inventory,
          and order P&amp;L workbooks for temporary fence install / pickup work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Jobs", value: formatNumber(jobCount, 0), href: "/jobs" },
          { label: "Branches", value: formatNumber(branchCount, 0), href: "/inventory" },
          { label: "Employees", value: formatNumber(employeeCount, 0), href: "/jobs" },
          {
            label: "Booked revenue",
            value: formatCurrency(revenue._sum.revenue ?? 0),
            href: "/pnl",
          },
        ].map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {c.label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{c.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent jobs</h2>
            <Link href="/jobs" className="text-sm text-blue-700 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {recentJobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <Link href={`/jobs/${j.id}`} className="font-medium text-blue-700 hover:underline">
                    {j.orderNumber}
                  </Link>
                  <span className="ml-2 text-slate-500">
                    {j.jobType} | {j.branch.code}
                  </span>
                  <div className="text-slate-600">{j.customer}</div>
                </div>
                <div className="text-right text-slate-700">{formatCurrency(j.revenue)}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Inventory attention</h2>
            <Link href="/inventory" className="text-sm text-blue-700 hover:underline">
              By branch
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-600">No items notably below starting qty.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {lowStock.map((r) => (
                <li key={r.itemId} className="flex justify-between py-2">
                  <span>
                    <span className="font-medium">{r.sku}</span>
                    <span className="ml-2 text-slate-500">{r.branchCode}</span>
                  </span>
                  <span className="tabular-nums text-slate-800">
                    {formatNumber(r.onHand, 0)} on hand
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Phase status</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Phase 0: scaffold, schema, seed - done</li>
          <li>Phase 1: jobs list/detail with material &amp; labor lines (read) - stub done; CRUD later</li>
          <li>Phase 2: inventory on-hand by branch - computed view done</li>
          <li>Phase 3: P&amp;L by order # - lookup page done</li>
          <li>Phases 4-5: analytics dashboards &amp; auth - planned</li>
        </ul>
        <p className="mt-2">
          See <code className="rounded bg-white px-1">docs/BUILD_PLAN.md</code> and{" "}
          <code className="rounded bg-white px-1">docs/DATA_MODEL.md</code>.
        </p>
      </section>
    </div>
  );
}
