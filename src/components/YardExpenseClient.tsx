"use client";

import { useState, useTransition } from "react";
import { createYardExpense, deleteYardExpense } from "@/app/expenses/actions";
import { YARD_EXPENSE_CATEGORIES } from "@/lib/ops-constants";

type Branch = { id: string; code: string; name: string };
type Vendor = { id: string; name: string };
type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  purchasedBy: string;
  notes: string | null;
  vendorText: string | null;
  branch: { code: string; name: string };
  vendor: { name: string } | null;
};

type Props = {
  branches: Branch[];
  vendors: Vendor[];
  expenses: Expense[];
  defaultPurchasedBy: string;
  today: string;
};

const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function YardExpenseClient({
  branches,
  vendors,
  expenses,
  defaultPurchasedBy,
  today,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    date: today,
    branchId: branches[0]?.id ?? "",
    category: YARD_EXPENSE_CATEGORIES[0] as string,
    vendorId: "",
    vendorText: "",
    amount: "",
    purchasedBy: defaultPurchasedBy,
    notes: "",
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const result = await createYardExpense(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setForm((f) => ({
        ...f,
        amount: "",
        notes: "",
        vendorText: "",
        vendorId: "",
      }));
    });
  }

  function onDelete(id: string) {
    if (!window.confirm("Delete this yard expense?")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await deleteYardExpense(fd);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">Add yard expense</h2>
        <p className="mt-1 text-xs text-slate-500">
          Yard-level spend (not forced onto jobs). Pick a vendor from Admin or type optional
          free-text.
        </p>
        {error ? (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Date *</span>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Yard *</span>
            <select
              required
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className={inputCls}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Category *</span>
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputCls}
            >
              {YARD_EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Vendor (list)</span>
            <select
              value={form.vendorId}
              onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
              className={inputCls}
            >
              <option value="">— optional —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Vendor (free text)</span>
            <input
              value={form.vendorText}
              disabled={Boolean(form.vendorId)}
              onChange={(e) => setForm({ ...form, vendorText: e.target.value })}
              className={inputCls}
              placeholder="If not in list"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Amount *</span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Purchased by</span>
            <input
              value={form.purchasedBy}
              onChange={(e) => setForm({ ...form, purchasedBy: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-xs font-medium text-slate-600">Notes</span>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputCls}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Add expense"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Yard</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">By</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 whitespace-nowrap">{e.date}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.branch.code}</td>
                <td className="px-3 py-2">{e.category}</td>
                <td className="px-3 py-2">
                  {e.vendor?.name ?? e.vendorText ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {e.amount.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </td>
                <td className="px-3 py-2">{e.purchasedBy}</td>
                <td className="px-3 py-2 text-slate-600">{e.notes ?? ""}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDelete(e.id)}
                    className="text-red-700 hover:underline disabled:opacity-60"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  No yard expenses yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
