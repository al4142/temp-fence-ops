import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { describeInventoryEffect, inventorySignForJobType } from "@/lib/inventory";
import { laborCostForLine } from "@/lib/pnl";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      branch: true,
      materials: { include: { inventoryItem: true } },
      labor: { include: { employee: true } },
    },
  });
  if (!job) notFound();

  const sign = inventorySignForJobType(job.jobType);
  const laborTotal = job.labor.reduce(
    (sum, l) =>
      sum + laborCostForLine(l.regularHours, l.overtimeHours, l.employee.hourlyRate),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/jobs" className="text-sm text-blue-700 hover:underline">
          <- Jobs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {job.orderNumber}{" "}
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-base">
            {job.jobType}
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatDate(job.date)} | {job.branch.name} ({job.branch.code}) |{" "}
          {describeInventoryEffect(job.jobType)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Customer" value={job.customer} />
        <Info label="Site" value={[job.address, job.city].filter(Boolean).join(", ") || "-"} />
        <Info label="Class" value={job.class ?? "-"} />
        <Info label="Fence" value={job.fenceType ?? "-"} />
        <Info label="Qty (LF)" value={job.qtyLf != null ? formatNumber(job.qtyLf, 0) : "-"} />
        <Info label="Gates / Screen" value={`${job.gates} / ${job.screen ? "Yes" : "No"}`} />
        <Info label="Account exec" value={job.accountExec ?? "-"} />
        <Info label="Revenue" value={formatCurrency(job.revenue)} />
        <Info
          label="Lodging / Freight / Misc"
          value={`${formatCurrency(job.lodging)} / ${formatCurrency(job.freight)} / ${formatCurrency(job.misc)}`}
        />
      </div>

      {job.notes ? (
        <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          {job.notes}
        </p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Materials (line items)</h2>
        <p className="mb-3 text-xs text-slate-500">
          Inventory effect = quantity x sign({job.jobType}) = {sign}. Free-text lines do not
          move on-hand.
        </p>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 pr-2">Qty</th>
              <th className="py-2 pr-2">Inv d</th>
              <th className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {job.materials.map((m) => {
              const name =
                m.inventoryItem?.name ?? m.itemName ?? "(unnamed)";
              const sku = m.inventoryItem?.sku;
              const delta = m.inventoryItemId ? sign * m.quantity : 0;
              return (
                <tr key={m.id}>
                  <td className="py-2 pr-2">
                    {name}
                    {sku ? (
                      <span className="ml-2 font-mono text-xs text-slate-500">{sku}</span>
                    ) : (
                      <span className="ml-2 text-xs text-amber-700">free-text</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 tabular-nums">{formatNumber(m.quantity, 1)}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {m.inventoryItemId ? (delta > 0 ? `+${delta}` : String(delta)) : "-"}
                  </td>
                  <td className="py-2 text-slate-600">{m.notes ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Labor</h2>
        <table className="mt-2 min-w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-2">Employee</th>
              <th className="py-2 pr-2">Position</th>
              <th className="py-2 pr-2">Reg</th>
              <th className="py-2 pr-2">OT</th>
              <th className="py-2 pr-2">Rate</th>
              <th className="py-2">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {job.labor.map((l) => {
              const cost = laborCostForLine(
                l.regularHours,
                l.overtimeHours,
                l.employee.hourlyRate
              );
              return (
                <tr key={l.id}>
                  <td className="py-2 pr-2 font-medium">{l.employee.name}</td>
                  <td className="py-2 pr-2 text-slate-600">{l.employee.position}</td>
                  <td className="py-2 pr-2 tabular-nums">{formatNumber(l.regularHours, 1)}</td>
                  <td className="py-2 pr-2 tabular-nums">{formatNumber(l.overtimeHours, 1)}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {formatCurrency(l.employee.hourlyRate)}
                  </td>
                  <td className="py-2 tabular-nums">{formatCurrency(cost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-slate-700">
          Labor cost (demo OT @ 1.5x): <strong>{formatCurrency(laborTotal)}</strong>
        </p>
        <p className="mt-1 text-sm">
          <Link
            href={`/pnl?order=${encodeURIComponent(job.orderNumber)}`}
            className="text-blue-700 hover:underline"
          >
            View P&amp;L for order {job.orderNumber} ->
          </Link>
        </p>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}
