/**
 * Jobs list + day confirmation filters.
 *
 * There is no separate calendar widget. From/To on `/jobs` (same date in both)
 * is the day list ops use to confirm what ran. Site Walk with $0 / no materials
 * must match the same rules as Install / Pickup — never drop empty tickets.
 */
import type { Prisma } from "@prisma/client";
import { dateOnlyToUtc, toDateInputValue } from "./job-form";
import { normalizeJobType } from "./job-constants";

export type JobsListFilterInput = {
  from?: string;
  to?: string;
  /** Resolved branch id (page maps code → id, or `__none__` when unknown). */
  branchId?: string;
  jobType?: string;
  q?: string;
};

export type JobsListVisibilityJob = {
  date: Date | string;
  branchId: string;
  jobType: string;
  orderNumber: string;
  customer: string;
  city?: string | null;
  address?: string | null;
  /** Not used for visibility — listed so tests can prove $0 jobs stay visible. */
  revenue?: number;
  /** Not used for visibility — listed so tests can prove empty-BOM jobs stay visible. */
  materialCount?: number;
};

function ymd(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return toDateInputValue(value);
}

/** True when the job's date-only field is that calendar day (UTC noon storage). */
export function jobIsOnCalendarDay(jobDate: Date | string, dayYmd: string): boolean {
  return ymd(jobDate) === dayYmd.trim();
}

/**
 * Prisma `where` for `/jobs`. Date / branch / type / search only.
 * Never keys on revenue, materials, labor, fence, or class.
 */
export function jobsListWhere(filters: JobsListFilterInput): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = {};
  const from = (filters.from ?? "").trim();
  const to = (filters.to ?? "").trim();
  const jobType = filters.jobType ? normalizeJobType(filters.jobType) : "";
  const q = (filters.q ?? "").trim();

  if (from || to) {
    where.date = {};
    if (from) where.date.gte = dateOnlyToUtc(from);
    if (to) where.date.lte = dateOnlyToUtc(to);
  }
  if (filters.branchId) where.branchId = filters.branchId;
  if (jobType) where.jobType = jobType;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { customer: { contains: q } },
      { city: { contains: q } },
      { address: { contains: q } },
    ];
  }
  return where;
}

function contains(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").includes(needle);
}

/**
 * In-memory twin of `jobsListWhere` for unit tests.
 * Revenue and materialCount are ignored on purpose.
 */
export function jobVisibleOnJobsList(
  job: JobsListVisibilityJob,
  filters: JobsListFilterInput = {}
): boolean {
  const from = (filters.from ?? "").trim();
  const to = (filters.to ?? "").trim();
  const jobDay = ymd(job.date);
  if (from && jobDay < from) return false;
  if (to && jobDay > to) return false;

  if (filters.branchId && job.branchId !== filters.branchId) return false;

  const jobType = filters.jobType ? normalizeJobType(filters.jobType) : "";
  if (jobType && normalizeJobType(job.jobType) !== jobType) return false;

  const q = (filters.q ?? "").trim();
  if (q) {
    const hit =
      contains(job.orderNumber, q) ||
      contains(job.customer, q) ||
      contains(job.city, q) ||
      contains(job.address, q);
    if (!hit) return false;
  }

  return true;
}

export function jobsOnCalendarDay<T extends { date: Date | string }>(
  jobs: T[],
  dayYmd: string
): T[] {
  return jobs.filter((job) => jobIsOnCalendarDay(job.date, dayYmd));
}
