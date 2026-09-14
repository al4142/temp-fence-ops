import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { YardExpenseClient } from "@/components/YardExpenseClient";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function YardExpensesPage() {
  const session = await getSession();
  const [branches, vendors, expenses] = await Promise.all([
    prisma.branch.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.vendor.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.yardExpense.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { branch: true, vendor: true },
      take: 200,
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Yard expenses</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ledger for PPE, consumables, tools, food, equipment, and other yard spend. Not
          forced onto job tickets.
        </p>
      </div>
      <YardExpenseClient
        branches={branches}
        vendors={vendors}
        defaultPurchasedBy={session?.name ?? ""}
        today={today}
        expenses={expenses.map((e) => ({
          id: e.id,
          date: formatDate(e.date),
          category: e.category,
          amount: e.amount,
          purchasedBy: e.purchasedBy,
          notes: e.notes,
          vendorText: e.vendorText,
          branch: { code: e.branch.code, name: e.branch.name },
          vendor: e.vendor ? { name: e.vendor.name } : null,
        }))}
      />
    </div>
  );
}
