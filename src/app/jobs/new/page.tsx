import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { emptyJobFormValues } from "@/lib/job-form";
import { JobForm } from "@/components/JobForm";
import { createJob } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const loaded = await Promise.all([
    prisma.branch.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.employee.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true, branchId: true, active: true },
    }),
    prisma.inventoryItem.findMany({
      orderBy: [{ sku: "asc" }, { name: "asc" }],
      select: { id: true, sku: true, name: true, unit: true, branchId: true },
    }),
  ]).catch((e) => {
    console.error("New job lookups failed; rendering form with empty options.", e);
    return [[], [], []];
  });
  const [branches, employees, inventory] = loaded;

  const initial = emptyJobFormValues({
    branchId: branches[0]?.id ?? "",
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/jobs" className="text-sm text-blue-700 hover:underline">
          Back to jobs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Create job</h1>
        <p className="mt-1 text-sm text-slate-600">
          Demo data only. Material lines move inventory by job type; labor feeds order P&amp;L.
        </p>
      </div>

      <JobForm
        mode="create"
        initial={initial}
        branches={branches}
        employees={employees}
        inventory={inventory}
        cancelHref="/jobs"
        onSubmit={createJob}
      />
    </div>
  );
}
