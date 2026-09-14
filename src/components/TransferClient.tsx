"use client";

import { useMemo, useState, useTransition } from "react";
import { createTransfer, deleteTransfer } from "@/app/transfers/actions";

type Branch = { id: string; code: string; name: string };
type Item = { id: string; sku: string; name: string; branchId: string; unit: string };
type TransferRow = {
  id: string;
  date: string;
  notes: string | null;
  fromBranch: { code: string };
  toBranch: { code: string };
  lines: Array<{
    id: string;
    quantity: number;
    fromInventoryItem: { sku: string; name: string };
  }>;
};

type Props = {
  branches: Branch[];
  items: Item[];
  transfers: TransferRow[];
  today: string;
};

type LineRow = { key: string; fromInventoryItemId: string; quantity: string; notes: string };

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function TransferClient({ branches, items, transfers, today }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [fromBranchId, setFromBranchId] = useState(branches[0]?.id ?? "");
  const [toBranchId, setToBranchId] = useState(branches[1]?.id ?? branches[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([
    { key: newKey(), fromInventoryItemId: "", quantity: "1", notes: "" },
  ]);

  const fromItems = useMemo(
    () => items.filter((i) => i.branchId === fromBranchId),
    [items, fromBranchId]
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createTransfer({
        date,
        fromBranchId,
        toBranchId,
        notes,
        lines: lines.map((l) => ({
          fromInventoryItemId: l.fromInventoryItemId,
          quantity: Number(l.quantity) || 0,
          notes: l.notes || null,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setNotes("");
      setLines([{ key: newKey(), fromInventoryItemId: "", quantity: "1", notes: "" }]);
    });
  }

  function onDelete(id: string) {
    if (!window.confirm("Delete this transfer? Inventory will reverse.")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await deleteTransfer(fd);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">New transfer</h2>
        <p className="mt-1 text-xs text-slate-500">
          Moves qty from yard -> to yard (from down, to up). Excluded from job analytics. Carry
          cost is conceptual in Wave 1; Wave 3 will refine avg cost.
        </p>
        {error ? (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Date *</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">From yard *</span>
            <select required value={fromBranchId} onChange={(e) => setFromBranchId(e.target.value)} className={inputCls}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">To yard *</span>
            <select required value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} className={inputCls}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-800">Lines</h3>
            <button
              type="button"
              className="text-xs text-blue-700 hover:underline"
              onClick={() =>
                setLines([...lines, { key: newKey(), fromInventoryItemId: "", quantity: "1", notes: "" }])
              }
            >
              + Add line
            </button>
          </div>
          {lines.map((row, idx) => (
            <div key={row.key} className="grid gap-2 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <select
                  required
                  className={inputCls}
                  value={row.fromInventoryItemId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...row, fromInventoryItemId: e.target.value };
                    setLines(next);
                  }}
                >
                  <option value="">Select item on from yard</option>
                  {fromItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} - {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="Qty"
                className={inputCls}
                value={row.quantity}
                onChange={(e) => {
                  const next = [...lines];
                  next[idx] = { ...row, quantity: e.target.value };
                  setLines(next);
                }}
              />
              <div className="flex gap-2">
                <input
                  placeholder="Notes"
                  className={inputCls}
                  value={row.notes}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...row, notes: e.target.value };
                    setLines(next);
                  }}
                />
                <button
                  type="button"
                  className="mt-1 text-xs text-red-600 hover:underline"
                  onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Create transfer"}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">Recent transfers</h2>
        {transfers.map((t) => (
          <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">
                  {t.date} | {t.fromBranch.code} -> {t.toBranch.code}
                </p>
                {t.notes ? <p className="text-sm text-slate-600">{t.notes}</p> : null}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => onDelete(t.id)}
                className="text-sm text-red-700 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            </div>
            <ul className="mt-2 text-sm text-slate-700">
              {t.lines.map((l) => (
                <li key={l.id}>
                  {l.fromInventoryItem.sku} {l.fromInventoryItem.name}: {l.quantity}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {transfers.length === 0 ? (
          <p className="text-sm text-slate-500">No transfers yet.</p>
        ) : null}
      </div>
    </div>
  );
}
