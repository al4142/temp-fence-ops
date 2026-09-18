import {
  JOB_TYPE_GROUP_LABELS,
  MONTH_LABELS,
  jobTypeGroup,
  type MonthlyLfCell,
} from "@/lib/analytics";
import { formatNumber } from "@/lib/format";

type Props = {
  year: number;
  defaultYear: number;
  knownTypes: string[];
  table: MonthlyLfCell[];
};

export function AnalyticsLfTable({ year, defaultYear, knownTypes, table }: Props) {
  return (
    <>
      <section className="space-y-2">
        <h2 className="font-semibold text-slate-900">
          Monthly LF by branch x job type ({year})
        </h2>
        <p className="text-sm text-slate-600">
          Totals use <code className="rounded bg-slate-100 px-1">qtyLf</code>. Job types map
          to Install / Drop (outbound), Pickup (inbound), or Other via inventory movement
          rules.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Branch</th>
                <th className="px-3 py-2 font-medium">Group</th>
                {MONTH_LABELS.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-medium">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-3 py-6 text-center text-slate-500">
                    No LF rows for these filters.
                  </td>
                </tr>
              ) : (
                table.map((row) => (
                  <tr key={`${row.branchId}-${row.group}`} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs">{row.branchCode}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-800">{row.group}</span>
                      <span className="ml-1 hidden text-xs text-slate-500 sm:inline">
                        {JOB_TYPE_GROUP_LABELS[row.group]}
                      </span>
                    </td>
                    {row.months.map((v, i) => (
                      <td
                        key={i}
                        className="px-2 py-2 text-right tabular-nums text-slate-700"
                      >
                        {v ? formatNumber(v, 0) : "-"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900">
                      {formatNumber(row.total, 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {table.length > 0 && (
              <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-medium">
                <tr>
                  <td className="px-3 py-2" colSpan={2}>
                    Total
                  </td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const sum = table.reduce((a, r) => a + r.months[i], 0);
                    return (
                      <td key={i} className="px-2 py-2 text-right tabular-nums">
                        {sum ? formatNumber(sum, 0) : "-"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(
                      table.reduce((a, r) => a + r.total, 0),
                      0
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">How groups are assigned</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Install / Drop</strong>: Install and Drop (outbound inventory)
          </li>
          <li>
            <strong>Pickup</strong>: Pickup (inbound inventory)
          </li>
          <li>
            <strong>Other</strong>: no inventory effect
          </li>
        </ul>
        <p className="mt-2 text-slate-600">
          Sample seed jobs are mostly March {defaultYear}. Labor cost uses the same OT @
          1.5x convention as P&amp;L. Job type on each ticket:{" "}
          {knownTypes.map((t) => (
            <code key={t} className="mr-1 rounded bg-white px-1">
              {t}
              {"->"}
              {jobTypeGroup(t)}
            </code>
          ))}
        </p>
      </section>
    </>
  );
}
