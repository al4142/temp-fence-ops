import { prisma } from "@/lib/prisma";
import { BranchAdminClient } from "@/components/BranchAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminBranchesPage() {
  const branches = await prisma.branch.findMany({
    orderBy: [{ active: "desc" }, { code: "asc" }],
    include: {
      _count: {
        select: {
          jobs: true,
          employees: true,
          inventoryItems: true,
          adjustments: true,
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Yards / branches</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage yards used on jobs, employees, and inventory. Prefer deactivate (Remove when in
          use) over hard delete so historical records stay linked.
        </p>
      </div>
      <BranchAdminClient branches={branches} />
    </div>
  );
}
