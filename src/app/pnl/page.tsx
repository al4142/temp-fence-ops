import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildOrderPnL } from "@/lib/pnl";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PnLPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const sp = await searchParams;
  const order = (sp.order ?? "").trim();

  const distinctOrders = await prisma.job.findMany({
    distinct: ["orderNumber"],
    select: { orderNumber: true, customer: true },
    orderBy: { orderNumber: "asc" },
  });

  let pnl = null;
  if (order) {
    const jobs = await prisma.job.findMany({
      where: { orderNumber: order },
      orderBy: { date: "asc" },
      include: {
        labor: { include: { employee: true } },
        materials: { include: { inventoryItem: true } },
        lodgingLines: true,
        freightLines: true,
        miscLines: true,
        variances: { include: { inventoryItem: true } },
      },
    });
    pnl = buildOrderPnL(jobs);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">P&amp;L by order #</h1>
        <p className="mt-1 text-sm text-slate-600">
          Rolls up all jobs sharing an order number. Labor uses employee hourly rate (OT @
          1.5x). Material cost uses catalog unit cost x quantity (free-text lines = $0). Lodging /
          freight / misc sum from cost line items. Material variance uses unit cost.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2" method="get">
        <div>
          <label htmlFor="order" className="block text-xs font-medium text-slate-600">
            Order number
          </label>
          <input
            id="order"
            name="order"
            defaultValue={order}
            list="orders"
            placeholder="e.g. ORD-1001"
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
          <datalist id="orders">
            {distinctOrders.map((o) => (
              <option key={o.orderNumber} value={o.orderNumber}>
                {o.customer}
              </option>
            ))}
          </datalist>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Look up
        </button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        {distinctOrders.map((o) => (
          <Link
            key={o.orderNumber}
            href={`/pnl?order=${encodeURIComponent(o.orderNumber)}`}
            className={
              order === o.orderNumber
                ? "rounded-full bg-slate-900 px-3 py-1 text-white"
                : "rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }
          >
            {o.orderNumber}
          </Link>
        ))}
      </div>

      {!order ? (
        <p className="text-sm text-slate-600">Select or enter an order number.</p>
      ) : !pnl ? (
        <p className="text-sm text-amber-800">No jobs found for {order}.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {pnl.orderNumber} - {pnl.customer}
            </h2>
            <p className="text-sm text-slate-600">{pnl.jobCount} job ticket(s)</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Revenue" value={formatCurrency(pnl.revenue)} />
              <Stat label="Labor cost" value={formatCurrency(pnl.laborCost)} />
              <Stat label="Material cost" value={formatCurrency(pnl.materialCost)} />
              <Stat label="Lodging" value={formatCurrency(pnl.lodging)} />
              <Stat label="Freight" value={formatCurrency(pnl.freight)} />
              <Stat label="Misc" value={formatCurrency(pnl.misc)} />
              <Stat label="Material variance" value={formatCurrency(pnl.varianceCost)} />
              <Stat label="Total cost" value={formatCurrency(pnl.totalCost)} />
              <Stat
                label="Gross profit"
                value={formatCurrency(pnl.grossProfit)}
                emphasize
              />
            </dl>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                  <th className="px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pnl.jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="px-3 py-2">{formatDate(j.date)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{j.jobType}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(j.revenue)}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/jobs/${j.id}`}
                        className="text-blue-700 hover:underline"
                      >
                        Open job
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={
          emphasize
            ? "mt-1 text-lg font-semibold text-slate-900"
            : "mt-1 text-base font-medium text-slate-800"
        }
      >
        {value}
      </dd>
    </div>
  );
}
