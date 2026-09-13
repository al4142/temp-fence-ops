import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { describeInventoryEffect } from "@/lib/inventory";
import { JobsFilters } from "@/components/JobsFilters";
import { dateOnlyToUtc } from "@/lib/job-form";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = {
  from?: string;
  to?: string;
  branch?: string;
  jobType?: string;
  q?: string;
  page?: string;
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();
  const branchCode = (sp.branch ?? "").trim().toUpperCase();
  const jobType = (sp.jobType ?? "").trim().toUpperCase();
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const branches = await prisma.branch.findMany({ orderBy: [{ active: "desc" }, { code: "asc" }] });

  const where: Prisma.JobWhereInput = {};

  if (from || to) {
    where.date = {};
    if (from) where.date.gte = dateOnlyToUtc(from);
    if (to) {
      // inclusive end-of-day via next day exclusive would be better, but noon UTC dates work with lte same day
      where.date.lte = dateOnlyToUtc(to);
    }
  }

  if (branchCode) {
    const branch = branches.find((b) => b.code === branchCode);
    if (branch) where.branchId = branch.id;
    else where.branchId = "__none__";
  }

  if (jobType) {
    where.jobType = jobType;
  }

  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { customer: { contains: q } },
      { city: { contains: q } },
      { address: { contains: q } },
    ];
  }

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: [{ date: "desc" }, { orderNumber: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        branch: true,
        _count: { select: { materials: true, labor: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Daily work tickets. Material line items drive inventory; labor lines drive P&amp;L.
            Filters are shareable via the URL.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          New job
        </Link>
      </div>

      <JobsFilters
        filters={{ from, to, branch: branchCode, jobType, q }}
        branches={branches}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Order #</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">City</th>
              <th className="px-3 py-2 font-medium">Inv.</th>
              <th className="px-3 py-2 font-medium text-right">Revenue</th>
              <th className="px-3 py-2 font-medium text-right">Lines</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-500">
                  No jobs found. Try clearing filters or create a new job.
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {formatDate(j.date)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/jobs/${j.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {j.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                      {j.jobType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{j.branch.code}</td>
                  <td className="px-3 py-2 text-slate-800">{j.customer}</td>
                  <td className="px-3 py-2 text-slate-600">{j.city ?? "\u2014"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {describeInventoryEffect(j.jobType)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(j.revenue)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {j._count.materials}m / {j._count.labor}l
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/jobs/${j.id}/edit`}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
