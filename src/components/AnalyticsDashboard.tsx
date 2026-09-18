import {
  type JobTypeGroup,
  type MonthlyLfCell,
  type MonthlySeries,
  type AnalyticsSummary,
} from "@/lib/analytics";
import { MonthlyLfChart } from "@/components/MonthlyLfChart";
import { AnalyticsFilters } from "@/components/AnalyticsFilters";
import { AnalyticsLfTable } from "@/components/AnalyticsLfTable";
import { formatCurrency, formatNumber } from "@/lib/format";

type BranchOpt = { id: string; code: string; name: string };

type Props = {
  year: number;
  years: number[];
  defaultYear: number;
  branchCode: string;
  branches: BranchOpt[];
  groupFilter: "all" | JobTypeGroup;
  knownTypes: string[];
  table: MonthlyLfCell[];
  series: MonthlySeries[];
  summary: AnalyticsSummary;
};

export function AnalyticsDashboard(props: Props) {
  const { year, years, defaultYear, branchCode, branches, groupFilter, knownTypes, table, series, summary } =
    props;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">
          Construction Data-style LF rollups by month, branch, and job type group. Filters
          run server-side with Prisma (year/branch/type) - only the filtered job fields are
          loaded, not the full inventory graph.
        </p>
      </div>

      <AnalyticsFilters
        year={year}
        years={years}
        branchCode={branchCode}
        branches={branches}
        groupFilter={groupFilter}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card label="Jobs" value={formatNumber(summary.jobCount, 0)} />
        <Card label="LF install / drop" value={formatNumber(summary.installLf, 0)} />
        <Card label="LF pickup" value={formatNumber(summary.pickupLf, 0)} />
        <Card label="Revenue" value={formatCurrency(summary.revenue)} />
        <Card label="Rough labor cost" value={formatCurrency(summary.laborCost)} />
      </div>

      <MonthlyLfChart series={series} />

      <AnalyticsLfTable
        year={year}
        defaultYear={defaultYear}
        knownTypes={knownTypes}
        table={table}
      />
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
