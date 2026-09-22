import { prisma } from "@/lib/prisma";
import { hourlyRateInputValue } from "@/lib/hourly-rate";
import { EmployeeAdminClient } from "@/components/EmployeeAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const [branches, employees] = await Promise.all([
    prisma.branch.findMany({ orderBy: [{ active: "desc" }, { code: "asc" }] }),
    prisma.employee.findMany({
      include: { branch: true },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage crew used on job labor lines. Prefer deactivate over delete so historical
          labor stays linked.
        </p>
      </div>
      <EmployeeAdminClient
        branches={branches}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          nameKey: e.nameKey,
          hourlyRate: hourlyRateInputValue(e.hourlyRate),
          position: e.position,
          branchId: e.branchId,
          active: e.active,
          branch: {
            id: e.branch.id,
            code: e.branch.code,
            name: e.branch.name,
            active: e.branch.active,
          },
        }))}
      />
    </div>
  );
}
