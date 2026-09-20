import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import {
  describeInventoryEffect,
  inventorySignForJobType,
  inventorySignForMaterial,
} from "@/lib/inventory";
import { laborCostForLine, materialCostForLine } from "@/lib/pnl";
import { isChainlinkType, normalizeFenceType, POST_MOUNT_LABELS } from "@/lib/bom/catalog";
import { formatSectionLabel, sectionsForJob, type StoredFenceSection } from "@/lib/bom/sections";

function formatSectionGates(s: StoredFenceSection): string {
  const parts: string[] = [];
  if (s.gateType && s.gateQty) parts.push(`${s.gateType} × ${s.gateQty}`);
  if (s.gateType2 && s.gateQty2) parts.push(`${s.gateType2} × ${s.gateQty2}`);
  if (parts.length) return parts.join(", ");
  return "0";
}

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = await prisma.job
    .findUnique({
      where: { id },
      include: {
        branch: true,
        materials: { include: { inventoryItem: true } },
        labor: { include: { employee: true } },
        lodgingLines: true,
        freightLines: true,
        miscLines: true,
        variances: { include: { inventoryItem: true } },
      },
    })
    .catch((e) => {
      console.error("Job detail query failed.", e);
      return null;
    });
  if (!job) notFound();

  const fenceSections = sectionsForJob(job);
  const totalLf = fenceSections.reduce((n, s) => n + (s.qtyLf ?? 0), 0);
  const sign = inventorySignForJobType(job.jobType);
  const laborTotal = job.labor.reduce(
    (sum, l) =>
      sum + laborCostForLine(l.regularHours, l.overtimeHours, l.employee.hourlyRate),
    0
  );
  const lodgingTotal = job.lodgingLines.reduce((s, l) => s + l.amount, 0);
  const freightTotal = job.freightLines.reduce((s, l) => s + l.cost, 0);
  const miscTotal = job.miscLines.reduce((s, l) => s + l.amount, 0);
  const varianceCost = job.variances.reduce((s, v) => {
    const unitCost = v.inventoryItem?.unitCost ?? 0;
    return s + materialCostForLine(-v.quantity, unitCost);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/jobs" className="text-sm text-blue-700 hover:underline">
            Back to jobs
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
        <div className="flex flex-wrap gap-2">
          <a
            href={`/jobs/${job.id}/export`}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
          >
            Export Project
          </a>
          <Link
            href={`/jobs/${job.id}/edit`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Edit job
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Customer" value={job.customer} />
        <Info label="Site" value={[job.address, job.city].filter(Boolean).join(", ") || "-"} />
        <Info label="Class" value={job.class ?? "-"} />
        <Info
          label="Fence sections"
          value={
            fenceSections.length > 1
              ? `${fenceSections.length} sections · ${formatNumber(totalLf, 0)} LF`
              : formatSectionLabel(fenceSections[0], 0)
          }
        />
        <Info label="Qty (LF)" value={totalLf ? formatNumber(totalLf, 0) : job.qtyLf != null ? formatNumber(job.qtyLf, 0) : "-"} />
        <Info
          label="Screen"
          value={job.screenSku || (job.screen ? "Yes" : "No")}
        />
        <Info label="Account exec" value={job.accountExec ?? "-"} />
        <Info label="Revenue" value={formatCurrency(job.revenue)} />
        <Info
          label="Lodging / Freight / Misc"
          value={`${formatCurrency(lodgingTotal)} / ${formatCurrency(freightTotal)} / ${formatCurrency(miscTotal)}`}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Fence sections</h2>
        <p className="mb-3 text-xs text-slate-500">
          Generate BOM ran each section and merged material lines. Jobs with no saved
          sections show as one driven section from the legacy fields.
        </p>
        <ul className="space-y-3 text-sm">
          {fenceSections.map((s, i) => {
            const ft = normalizeFenceType(s.fenceType);
            const mount =
              ft && isChainlinkType(ft)
                ? POST_MOUNT_LABELS[s.postMount === "plate" ? "plate" : "driven"]
                : null;
            return (
              <li key={i} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="font-medium text-slate-900">{formatSectionLabel(s, i)}</div>
                <div className="mt-1 text-xs text-slate-600">
                  {[
                    mount,
                    s.topRail ? "Top rail" : null,
                    s.bottomRail ? "Bottom rail" : null,
                    s.weightMode,
                    `Gates: ${formatSectionGates(s)}`,
                    s.terminalsManual ? `Manual terminals: ${s.terminalsManual}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {job.notes ? (
        <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          {job.notes}
        </p>
      ) : null}

      <CostLinesSection
        lodging={job.lodgingLines}
        freight={job.freightLines}
        misc={job.miscLines}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Materials (line items)</h2>
        <p className="mb-3 text-xs text-slate-500">
          Inventory effect = quantity x sign({job.jobType}
          {sign > 0 ? ", reusable" : ""}). Consumables (reusable = false) do not restock on
          Pickup. Free-text lines do not move on-hand.
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
              const name = m.inventoryItem?.name ?? m.itemName ?? "(unnamed)";
              const sku = m.inventoryItem?.sku;
              const lineSign = inventorySignForMaterial(
                job.jobType,
                m.inventoryItem?.reusable !== false
              );
              const delta = m.inventoryItemId ? lineSign * m.quantity : 0;
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
        <h2 className="font-semibold text-slate-900">Material variance</h2>
        <p className="mb-3 text-xs text-slate-500">
          Qty is inventory delta (+/-). P&amp;L variance cost (at unit cost):{" "}
          <strong>{formatCurrency(varianceCost)}</strong>
        </p>
        {job.variances.length === 0 ? (
          <p className="text-sm text-slate-500">None.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Reason</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {job.variances.map((v) => {
                const name = v.inventoryItem?.name ?? v.itemName ?? "(unnamed)";
                return (
                  <tr key={v.id}>
                    <td className="py-2 pr-2">{name}</td>
                    <td className="py-2 pr-2 tabular-nums">
                      {v.quantity > 0 ? "+" : ""}
                      {formatNumber(v.quantity, 1)}
                    </td>
                    <td className="py-2 pr-2">{v.reason}</td>
                    <td className="py-2 text-slate-600">{v.notes ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
            View P&amp;L for order {job.orderNumber}
          </Link>
        </p>
      </section>
    </div>
  );
}

function CostLinesSection({
  lodging,
  freight,
  misc,
}: {
  lodging: Array<{ id: string; amount: number; facility: string | null; notes: string | null }>;
  freight: Array<{ id: string; cost: number; company: string | null; notes: string | null }>;
  misc: Array<{ id: string; amount: number; category: string | null; notes: string | null }>;
}) {
  if (lodging.length + freight.length + misc.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Cost lines</h2>
        <p className="mt-1 text-sm text-slate-500">No lodging / freight / misc lines.</p>
      </section>
    );
  }
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-slate-900">Cost lines</h2>
      {lodging.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-slate-700">Lodging</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {lodging.map((l) => (
              <li key={l.id}>
                {formatCurrency(l.amount)}
                {l.facility ? ` - ${l.facility}` : ""}
                {l.notes ? ` (${l.notes})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {freight.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-slate-700">Freight</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {freight.map((l) => (
              <li key={l.id}>
                {formatCurrency(l.cost)}
                {l.company ? ` - ${l.company}` : ""}
                {l.notes ? ` (${l.notes})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {misc.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-slate-700">Misc</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {misc.map((l) => (
              <li key={l.id}>
                {formatCurrency(l.amount)}
                {l.category ? ` - ${l.category}` : ""}
                {l.notes ? ` (${l.notes})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
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
