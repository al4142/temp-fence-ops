import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toDateInputValue, type JobFormValues } from "@/lib/job-form";
import { JobForm } from "@/components/JobForm";
import { deleteJob, updateJob } from "../../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditJobPage({ params }: Props) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      materials: true,
      labor: true,
    },
  });
  if (!job) notFound();

  const [branches, employees, inventory] = await Promise.all([
    prisma.branch.findMany({
      where: { OR: [{ active: true }, { id: job.branchId }] },
      orderBy: { code: "asc" },
    }),
    prisma.employee.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true, branchId: true, active: true },
    }),
    prisma.inventoryItem.findMany({
      orderBy: [{ sku: "asc" }, { name: "asc" }],
      select: { id: true, sku: true, name: true, unit: true, branchId: true },
    }),
  ]);

  const initial: JobFormValues = {
    date: toDateInputValue(job.date),
    branchId: job.branchId,
    class: job.class ?? "",
    orderNumber: job.orderNumber,
    customer: job.customer,
    address: job.address ?? "",
    city: job.city ?? "",
    jobType: job.jobType,
    fenceType: job.fenceType ?? "",
    qtyLf: job.qtyLf != null ? String(job.qtyLf) : "",
    screen: job.screen,
    gates: String(job.gates),
    notes: job.notes ?? "",
    accountExec: job.accountExec ?? "",
    revenue: String(job.revenue),
    lodging: String(job.lodging),
    freight: String(job.freight),
    misc: String(job.misc),
    materials: job.materials.map((m) => ({
      inventoryItemId: m.inventoryItemId,
      itemName: m.itemName,
      quantity: m.quantity,
      notes: m.notes,
    })),
    labor: job.labor.map((l) => ({
      employeeId: l.employeeId,
      regularHours: l.regularHours,
      overtimeHours: l.overtimeHours,
    })),
  };

  async function save(values: JobFormValues) {
    "use server";
    return updateJob(id, values);
  }

  async function remove() {
    "use server";
    return deleteJob(id);
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/jobs/${id}`} className="text-sm text-blue-700 hover:underline">
          Back to job detail
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Edit job {job.orderNumber}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Saving replaces material and labor lines for this job in one transaction.
        </p>
      </div>

      <JobForm
        mode="edit"
        initial={initial}
        branches={branches}
        employees={employees}
        inventory={inventory}
        cancelHref={`/jobs/${id}`}
        onSubmit={save}
        onDelete={remove}
      />
    </div>
  );
}
