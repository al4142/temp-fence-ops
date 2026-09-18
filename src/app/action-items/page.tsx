import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { toDateInputValue } from "@/lib/job-form";
import { actionItemOpenDays, parseActionItemTab } from "@/lib/action-items";
import { ActionItemsClient } from "@/components/ActionItemsClient";

export const dynamic = "force-dynamic";

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = parseActionItemTab(sp.tab);

  const [items, employees] = await Promise.all([
    prisma.actionItem.findMany({
      orderBy: [{ date: "asc" }, { createdAt: "desc" }],
    }),
    prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);

  const today = new Date();
  const rows = [...items]
    .sort((a, b) => {
      if (a.status === "Done" && b.status === "Done") {
        return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
      }
      return a.date.getTime() - b.date.getTime();
    })
    .map((item) => {
      const openDays = actionItemOpenDays(item, today);
      return {
        id: item.id,
        date: formatDate(item.date),
        dateInput: toDateInputValue(item.date),
        task: item.task,
        assignedTo: item.assignedTo,
        notes: item.notes,
        status: item.status,
        completedDate: item.completedAt ? formatDate(item.completedAt) : null,
        openDays,
      };
    });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Action items</h1>
        <p className="mt-1 text-sm text-slate-600">
          Open tasks for the yard. Open days count calendar days from the start date while the
          item is still Open. Completed items live on the Completed tab.
        </p>
      </div>
      <ActionItemsClient
        tab={tab}
        today={today.toISOString().slice(0, 10)}
        employeeNames={employees.map((e) => e.name)}
        items={rows}
      />
    </div>
  );
}
