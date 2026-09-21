import { inventorySignForJobType } from "./inventory";
import { laborCostForLine } from "./pnl";
import { isCancelledStatus } from "./job-constants";

/** Coarse groups used on Construction Data-style rollups. */
export type JobTypeGroup = "Install" | "Pickup" | "Other";

export const JOB_TYPE_GROUP_LABELS: Record<JobTypeGroup, string> = {
  Install: "Install / Drop",
  Pickup: "Pickup",
  Other: "Other",
};

export function jobTypeGroup(jobType: string): JobTypeGroup {
  const sign = inventorySignForJobType(jobType);
  if (sign < 0) return "Install";
  if (sign > 0) return "Pickup";
  return "Other";
}

/** Job types belonging to a filter group (for Prisma `in` clauses). */
export function jobTypesForGroupFilter(
  group: "all" | JobTypeGroup,
  knownTypes: string[]
): string[] | undefined {
  if (group === "all") return undefined;
  return knownTypes.filter((t) => jobTypeGroup(t) === group);
}

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type AnalyticsJobRow = {
  id: string;
  date: Date;
  branchId: string;
  jobType: string;
  /** Missing / Active counted; Cancelled skipped in rollups. */
  status?: string | null;
  qtyLf: number | null;
  revenue: number;
};

export type MonthlyLfCell = {
  branchId: string;
  branchCode: string;
  group: JobTypeGroup;
  /** Index 0 = Jan ... 11 = Dec */
  months: number[];
  total: number;
};

export type MonthlySeries = {
  month: number; // 1-12
  label: string;
  instLf: number;
  puLf: number;
  otherLf: number;
  totalLf: number;
};

export type AnalyticsSummary = {
  jobCount: number;
  installLf: number;
  pickupLf: number;
  otherLf: number;
  revenue: number;
  laborCost: number;
};

export function yearDateRange(year: number): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export function yearsFromBounds(min: Date | null, max: Date | null): number[] {
  if (!min || !max) {
    const y = new Date().getUTCFullYear();
    return [y];
  }
  const start = min.getUTCFullYear();
  const end = max.getUTCFullYear();
  const years: number[] = [];
  for (let y = start; y <= end; y++) years.push(y);
  return years.length ? years : [new Date().getUTCFullYear()];
}

export function buildMonthlyLfTable(
  jobs: AnalyticsJobRow[],
  branches: Array<{ id: string; code: string }>
): MonthlyLfCell[] {
  const branchById = new Map(branches.map((b) => [b.id, b.code]));
  const key = (branchId: string, group: JobTypeGroup) => `${branchId}|${group}`;
  const map = new Map<string, MonthlyLfCell>();

  const ensure = (branchId: string, group: JobTypeGroup): MonthlyLfCell => {
    const k = key(branchId, group);
    let cell = map.get(k);
    if (!cell) {
      cell = {
        branchId,
        branchCode: branchById.get(branchId) ?? "?",
        group,
        months: Array(12).fill(0),
        total: 0,
      };
      map.set(k, cell);
    }
    return cell;
  };

  for (const job of jobs) {
    if (isCancelledStatus(job.status)) continue;
    const lf = job.qtyLf ?? 0;
    if (!lf) continue;
    const group = jobTypeGroup(job.jobType);
    const cell = ensure(job.branchId, group);
    const m = job.date.getUTCMonth();
    cell.months[m] += lf;
    cell.total += lf;
  }

  const groupOrder: JobTypeGroup[] = ["Install", "Pickup", "Other"];
  return [...map.values()].sort((a, b) => {
    const bc = a.branchCode.localeCompare(b.branchCode);
    if (bc !== 0) return bc;
    return groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group);
  });
}

export function buildMonthlySeries(jobs: AnalyticsJobRow[]): MonthlySeries[] {
  const series: MonthlySeries[] = MONTH_LABELS.map((label, i) => ({
    month: i + 1,
    label,
    instLf: 0,
    puLf: 0,
    otherLf: 0,
    totalLf: 0,
  }));

  for (const job of jobs) {
    if (isCancelledStatus(job.status)) continue;
    const lf = job.qtyLf ?? 0;
    if (!lf) continue;
    const m = job.date.getUTCMonth();
    const group = jobTypeGroup(job.jobType);
    if (group === "Install") series[m].instLf += lf;
    else if (group === "Pickup") series[m].puLf += lf;
    else series[m].otherLf += lf;
    series[m].totalLf += lf;
  }

  return series;
}

export function summarizeJobs(
  jobs: AnalyticsJobRow[],
  laborLines: Array<{
    regularHours: number;
    overtimeHours: number;
    employee: { hourlyRate: number };
  }>
): AnalyticsSummary {
  let installLf = 0;
  let pickupLf = 0;
  let otherLf = 0;
  let revenue = 0;
  let jobCount = 0;

  for (const job of jobs) {
    if (isCancelledStatus(job.status)) continue;
    jobCount += 1;
    const lf = job.qtyLf ?? 0;
    const group = jobTypeGroup(job.jobType);
    if (group === "Install") installLf += lf;
    else if (group === "Pickup") pickupLf += lf;
    else otherLf += lf;
    revenue += job.revenue;
  }

  let laborCost = 0;
  for (const line of laborLines) {
    laborCost += laborCostForLine(
      line.regularHours,
      line.overtimeHours,
      line.employee.hourlyRate
    );
  }

  return {
    jobCount,
    installLf,
    pickupLf,
    otherLf,
    revenue,
    laborCost,
  };
}
