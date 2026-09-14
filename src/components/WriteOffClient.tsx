"use client";

import { useMemo, useState, useTransition } from "react";
import { createWriteOff, deleteWriteOff } from "@/app/write-offs/actions";
import { WRITEOFF_REASONS } from "@/lib/ops-constants";

type Branch = { id: string; code: string; name: string };
type Item = { id: string; sku: string; name: string; branchId: string };
type Row = {
  id: string;
  date: string;
  quantity: number;
  reason: string;
  notes: string | null;
  branch: { code: string };
  inventoryItem: { sku: string; name: string };
};

type Props = {
  branches: Branch[];
  items: Item[];
  writeOffs: Row[];
  today: string;
};

const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function WriteOffClient({ branches, items, writeOffs, today }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    date: today,
    branchId: branches[0]?.id ?? "",
    inventoryItemId: "",
    quantity: "1",
    reason: WRITEOFF_REASONS[0] as string,
    notes: "",
  });

  const filteredItems = useMemo(
    () => items.filter((i) => i.branchId === form.branchId),
    [items, form.branchId]
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const result = await createWriteOff(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setForm((f) => ({ ...f, inventoryItemId: "", quantity: "1", notes: "" }));
    });
  }

  function onDelete(id: string) {
    if (!window.confirm("Delete this write-off?")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await deleteWriteOff(fd);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">Record write-off</h2>
        <p className="mt-1 text-xs text-slate-500">
          Damaged / scrap / shrink reduces on-hand. Excluded from job analytics.
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
              onChange={(e) =>
                setForm({ ...form, branchId: e.target.value, inventoryItemId: "" })
              }
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
            <span className="text-xs font-medium text-slate-600">Item *</span>
            <select
              required
              value={form.inventoryItemId}
              onChange={(e) => setForm({ ...form, inventoryItemId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select item</option>
              {filteredItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku} - {i.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Qty *</span>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Reason *</span>
            <select
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={inputCls}
            >
              {WRITEOFF_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
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
          {pending ? "Saving..." : "Record write-off"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Yard</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {writeOffs.map((w) => (
              <tr key={w.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 whitespace-nowrap">{w.date}</td>
                <td className="px-3 py-2 font-mono text-xs">{w.branch.code}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-slate-500">
                    {w.inventoryItem.sku}
                  </span>{" "}
                  {w.inventoryItem.name}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{w.quantity}</td>
                <td className="px-3 py-2">{w.reason}</td>
                <td className="px-3 py-2 text-slate-600">{w.notes ?? ""}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDelete(w.id)}
                    className="text-red-700 hover:underline disabled:opacity-60"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {writeOffs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No write-offs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
