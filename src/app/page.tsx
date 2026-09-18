import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { computeOnHand } from "@/lib/inventory";
import {
  actionItemOpenDays,
  actionItemsPath,
  formatOpenDays,
  isActionItemOverdue,
} from "@/lib/action-items";
import { ActionItemStatusBadge } from "@/components/ActionItemStatusBadge";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [
    jobCount,
    branchCount,
    employeeCount,
    recentJobs,
    items,
    materials,
    adjustments,
    transferLines,
    writeOffs,
    variances,
    openActionItems,
    completedActionItemCount,
  ] = await Promise.all([
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
      prisma.transferLine.findMany({
        select: { fromInventoryItemId: true, toInventoryItemId: true, quantity: true },
      }),
      prisma.writeOff.findMany({ select: { inventoryItemId: true, quantity: true } }),
      prisma.jobMaterialVariance.findMany({
        select: { inventoryItemId: true, quantity: true },
      }),
      prisma.actionItem.findMany({
        where: { status: "Open" },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        take: 6,
      }),
      prisma.actionItem.count({ where: { status: "Done" } }),
    ]);

  const onHand = computeOnHand({
    items,
    materials,
    adjustments,
    transferLines,
    writeOffs,
    variances,
  });
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

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Action items</h2>
            <p className="text-xs text-slate-500">Open tasks for the yard</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={actionItemsPath("completed")}
              className="text-slate-500 hover:underline"
            >
              {completedActionItemCount} completed
            </Link>
            <Link href={actionItemsPath("open")} className="text-blue-700 hover:underline">
              View all
            </Link>
          </div>
        </div>
        {openActionItems.length === 0 ? (
          <p className="text-sm text-slate-600">No open action items.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Task</th>
                    <th className="py-2 pr-3 font-medium">Assigned to</th>
                    <th className="whitespace-nowrap py-2 pr-3 text-right font-medium">Open days</th>
                    <th className="py-2 pl-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openActionItems.map((item) => {
                    const openDays = actionItemOpenDays(item);
                    const overdue = isActionItemOverdue(openDays);
                    return (
                      <tr key={item.id} className={overdue ? "bg-amber-50/70" : undefined}>
                        <td className="whitespace-nowrap py-2 pr-3 text-slate-700">
                          {formatDate(item.date)}
                        </td>
                        <td className="py-2 pr-3 font-medium text-slate-900">{item.task}</td>
                        <td className="py-2 pr-3 text-slate-600">{item.assignedTo ?? "—"}</td>
                        <td
                          className={
                            overdue
                              ? "py-2 pr-3 text-right tabular-nums font-medium text-amber-900"
                              : "py-2 pr-3 text-right tabular-nums text-slate-700"
                          }
                        >
                          {formatOpenDays(openDays)}
                        </td>
                        <td className="py-2 pl-3">
                          <ActionItemStatusBadge status={item.status} openDays={openDays} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 text-sm md:hidden">
              {openActionItems.map((item) => {
                const openDays = actionItemOpenDays(item);
                const overdue = isActionItemOverdue(openDays);
                return (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-2">
                    <div>
                      <div className="font-medium text-slate-900">{item.task}</div>
                      <div className="text-slate-500">
                        {formatDate(item.date)}
                        {item.assignedTo ? ` · ${item.assignedTo}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <ActionItemStatusBadge status={item.status} openDays={openDays} />
                      <div
                        className={
                          overdue
                            ? "mt-1 text-xs font-medium text-amber-900"
                            : "mt-1 text-xs text-slate-500"
                        }
                      >
                        {formatOpenDays(openDays)}d
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Phase status</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Phase 0: scaffold, schema, seed - done</li>
          <li>Phase 1: jobs create/edit/delete with material &amp; labor lines - done</li>
          <li>Phase 2: inventory on-hand by branch - computed view done</li>
          <li>Phase 3: P&amp;L by order # - lookup page done</li>
          <li>Phase 4: analytics dashboards (LF rollups) - done</li>
          <li>Phase 5: auth &amp; private deploy - planned</li>
        </ul>
        <p className="mt-2">
          See <code className="rounded bg-white px-1">docs/BUILD_PLAN.md</code> and{" "}
          <code className="rounded bg-white px-1">docs/DATA_MODEL.md</code>.
        </p>
      </section>
    </div>
  );
}
