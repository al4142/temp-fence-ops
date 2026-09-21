import Link from "next/link";
import { JOB_TYPES } from "@/lib/job-constants";

type BranchOpt = { id: string; code: string; name: string };

export type JobsFilterValues = {
  from: string;
  to: string;
  branch: string;
  jobType: string;
  q: string;
  hideCancelled: boolean;
};

type Props = {
  filters: JobsFilterValues;
  branches: BranchOpt[];
  total: number;
  page: number;
  pageSize: number;
};

export function JobsFilters({ filters, branches, total, page, pageSize }: Props) {
  const hasFilters =
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    Boolean(filters.branch) ||
    Boolean(filters.jobType) ||
    Boolean(filters.q) ||
    filters.hideCancelled;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.branch) params.set("branch", filters.branch);
    if (filters.jobType) params.set("jobType", filters.jobType);
    if (filters.q) params.set("q", filters.q);
    if (filters.hideCancelled) params.set("hideCancelled", "1");
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  }

  return (
    <div className="space-y-3">
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label htmlFor="from" className="block text-xs font-medium text-slate-600">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={filters.from}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs font-medium text-slate-600">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={filters.to}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="branch" className="block text-xs font-medium text-slate-600">
            Branch
          </label>
          <select
            id="branch"
            name="branch"
            defaultValue={filters.branch}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.code}>
                {b.code} - {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="jobType" className="block text-xs font-medium text-slate-600">
            Job type
          </label>
          <select
            id="jobType"
            name="jobType"
            defaultValue={filters.jobType}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">All types</option>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="q" className="block text-xs font-medium text-slate-600">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="Order #, customer, city, address"
            defaultValue={filters.q}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            id="hideCancelled"
            name="hideCancelled"
            type="checkbox"
            value="1"
            defaultChecked={filters.hideCancelled}
            className="rounded border-slate-300"
          />
          Hide cancelled
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Apply
        </button>
        {hasFilters ? (
          <Link
            href="/jobs"
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p>
          {total === 0
            ? "No jobs match."
            : `Showing ${(page - 1) * pageSize + 1}\u2013${Math.min(page * pageSize, total)} of ${total}`}
        </p>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="text-blue-700 hover:underline">
                Previous
              </Link>
            ) : (
              <span className="text-slate-400">Previous</span>
            )}
            <span>
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="text-blue-700 hover:underline">
                Next
              </Link>
            ) : (
              <span className="text-slate-400">Next</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
