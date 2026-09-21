import { prisma } from "@/lib/prisma";
import {
  buildMonthlyLfTable,
  buildMonthlySeries,
  jobTypesForGroupFilter,
  summarizeJobs,
  yearDateRange,
  yearsFromBounds,
  type JobTypeGroup,
} from "@/lib/analytics";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { JOB_STATUS_CANCELLED } from "@/lib/job-constants";

export const dynamic = "force-dynamic";

type Search = {
  year?: string;
  branch?: string;
  group?: string;
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;

  const [branches, bounds, knownTypeRows] = await Promise.all([
    prisma.branch.findMany({ orderBy: [{ active: "desc" }, { code: "asc" }] }),
    prisma.job.aggregate({ _min: { date: true }, _max: { date: true } }),
    prisma.job.findMany({ distinct: ["jobType"], select: { jobType: true } }),
  ]);

  const years = yearsFromBounds(bounds._min.date, bounds._max.date);
  const defaultYear = years[years.length - 1] ?? new Date().getUTCFullYear();
  const year = parseYear(sp.year, defaultYear, years);
  const branchCode = (sp.branch ?? "all").toUpperCase();
  const groupFilter = parseGroup(sp.group);

  const branch =
    branchCode === "ALL" ? null : branches.find((b) => b.code === branchCode) ?? null;

  const knownTypes = knownTypeRows.map((r) => r.jobType);
  const typeIn = jobTypesForGroupFilter(groupFilter, knownTypes);

  const { gte, lt } = yearDateRange(year);
  const jobWhere = {
    date: { gte, lt },
    status: { not: JOB_STATUS_CANCELLED },
    ...(branch ? { branchId: branch.id } : {}),
    ...(typeIn && typeIn.length > 0
      ? { jobType: { in: typeIn } }
      : groupFilter !== "all" && (!typeIn || typeIn.length === 0)
        ? { jobType: { in: ["__none__"] } }
        : {}),
  };

  const [jobs, laborLines] = await Promise.all([
    prisma.job.findMany({
      where: jobWhere,
      select: {
        id: true,
        date: true,
        branchId: true,
        jobType: true,
        status: true,
        qtyLf: true,
        revenue: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.jobLabor.findMany({
      where: { job: jobWhere },
      select: {
        regularHours: true,
        overtimeHours: true,
        employee: { select: { hourlyRate: true } },
      },
    }),
  ]);

  const tableBranches = branch ? [branch] : branches;
  const table = buildMonthlyLfTable(jobs, tableBranches);
  const series = buildMonthlySeries(jobs);
  const summary = summarizeJobs(jobs, laborLines);

  return (
    <AnalyticsDashboard
      year={year}
      years={years}
      defaultYear={defaultYear}
      branchCode={branch ? branch.code : "ALL"}
      branches={branches.map((b) => ({ id: b.id, code: b.code, name: b.name }))}
      groupFilter={groupFilter}
      knownTypes={knownTypes}
      table={table}
      series={series}
      summary={summary}
    />
  );
}

function parseYear(raw: string | undefined, fallback: number, allowed: number[]): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !allowed.includes(n)) return fallback;
  return n;
}

function parseGroup(raw: string | undefined): "all" | JobTypeGroup {
  const v = (raw ?? "all").trim().toLowerCase();
  if (v === "install") return "Install";
  if (v === "pickup") return "Pickup";
  if (v === "other") return "Other";
  return "all";
}
