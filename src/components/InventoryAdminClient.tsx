"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deactivateInventoryItem,
  deleteInventoryItem,
  reactivateInventoryItem,
} from "@/app/admin/inventory/actions";
import { InventoryItemForm, AdjustmentForm } from "@/components/InventoryAdminForms";

type Branch = { id: string; code: string; name: string };
type Item = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  reusable: boolean;
  active: boolean;
  branchId: string;
  startingQty: number;
  unitCost: number;
  branch: Branch;
};
type OnHand = { itemId: string; onHand: number; movementQty: number; adjustmentQty: number };
type Adjustment = {
  id: string;
  quantityDelta: number;
  reason: string | null;
  adjustedAt: string;
  inventoryItem: { sku: string; name: string };
  branch: { code: string };
};

type Props = {
  branches: Branch[];
  items: Item[];
  onHandById: Record<string, OnHand>;
  recentAdjustments: Adjustment[];
};

export function InventoryAdminClient({
  branches,
  items,
  onHandById,
  recentAdjustments,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const [branchFilter, setBranchFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (showInactive || i.active) && (!branchFilter || i.branchId === branchFilter)
      ),
    [items, branchFilter, showInactive]
  );

  function cancelEdit() {
    setEditing(null);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="space-y-8">
      <InventoryItemForm
        key={formKey + (editing?.id ?? "new")}
        branches={branches}
        editing={editing}
        onCancel={cancelEdit}
      />
      <AdjustmentForm items={items} />

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-slate-900">Catalog &amp; on-hand</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(ev) => setShowInactive(ev.target.checked)}
              />
              Show inactive
            </label>
            <select
              value={branchFilter}
              onChange={(ev) => setBranchFilter(ev.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.code}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Branch</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium text-right">Start</th>
                <th className="px-3 py-2 font-medium text-right">Moves</th>
                <th className="px-3 py-2 font-medium text-right">Adj</th>
                <th className="px-3 py-2 font-medium text-right">On hand</th>
                <th className="px-3 py-2 font-medium text-right">Cost</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((i) => {
                const oh = onHandById[i.id];
                return (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs">{i.branch.code}</td>
                    <td className="px-3 py-2 font-mono text-xs">{i.sku}</td>
                    <td className="px-3 py-2">
                      {i.name}
                      {!i.reusable ? (
                        <span className="ml-1 text-xs text-slate-400">(consumable)</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{i.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{i.startingQty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{oh?.movementQty ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{oh?.adjustmentQty ?? 0}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {oh?.onHand ?? i.startingQty}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">${i.unitCost.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {i.active ? (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(i)}
                          className="text-blue-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set("id", i.id);
                            startTransition(async () => {
                              const r = i.active
                                ? await deactivateInventoryItem(fd)
                                : await reactivateInventoryItem(fd);
                              if (!r.ok) setError(r.error);
                              else setError(null);
                            });
                          }}
                          className={
                            i.active
                              ? "text-amber-700 hover:underline"
                              : "text-emerald-700 hover:underline"
                          }
                        >
                          {i.active ? "Deactivate" : "Reactivate"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Delete ${i.sku}? In-use SKUs cannot be deleted.`)) return;
                            const fd = new FormData();
                            fd.set("id", i.id);
                            startTransition(async () => {
                              const r = await deleteInventoryItem(fd);
                              if (!r.ok) setError(r.error);
                              else setError(null);
                            });
                          }}
                          className="text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium text-slate-900">Recent adjustments</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Branch</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium text-right">Delta</th>
                <th className="px-3 py-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No adjustments yet.
                  </td>
                </tr>
              ) : (
                recentAdjustments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{a.adjustedAt.slice(0, 10)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.branch.code}</td>
                    <td className="px-3 py-2">
                      {a.inventoryItem.sku} - {a.inventoryItem.name}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {a.quantityDelta > 0 ? "+" : ""}
                      {a.quantityDelta}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{a.reason ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
