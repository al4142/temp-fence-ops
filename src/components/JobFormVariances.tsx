"use client";

import { VARIANCE_REASONS } from "@/lib/ops-constants";
import type { InventoryOption } from "@/components/JobForm";

export type VarianceRow = {
  key: string;
  inventoryItemId: string;
  itemName: string;
  quantity: string;
  reason: string;
  notes: string;
};

type Props = {
  variances: VarianceRow[];
  setVariances: (rows: VarianceRow[]) => void;
  filteredInventory: InventoryOption[];
  inputClass: string;
  labelClass: string;
  newKey: () => string;
};

export function JobFormVariances({
  variances,
  setVariances,
  filteredInventory,
  inputClass,
  labelClass,
  newKey,
}: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Material variance</h2>
          <p className="text-xs text-slate-500">
            Qty is inventory delta: negative = leave yard (damaged/lost/extra used); positive =
            returned unused. Shown on job P&amp;L as variance.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs text-blue-700 hover:underline"
          onClick={() =>
            setVariances([
              ...variances,
              {
                key: newKey(),
                inventoryItemId: "",
                itemName: "",
                quantity: "",
                reason: VARIANCE_REASONS[0],
                notes: "",
              },
            ])
          }
        >
          + Add variance
        </button>
      </div>
      <div className="space-y-2">
        {variances.map((row, idx) => (
          <div key={row.key} className="grid gap-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className={labelClass}>Catalog item</label>
              <select
                className={inputClass}
                value={row.inventoryItemId}
                onChange={(e) => {
                  const next = [...variances];
                  next[idx] = { ...row, inventoryItemId: e.target.value, itemName: "" };
                  setVariances(next);
                }}
              >
                <option value="">Free-text / none</option>
                {filteredInventory.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.sku} - {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Or name</label>
              <input
                className={inputClass}
                disabled={Boolean(row.inventoryItemId)}
                value={row.itemName}
                onChange={(e) => {
                  const next = [...variances];
                  next[idx] = { ...row, itemName: e.target.value };
                  setVariances(next);
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Qty (+/-)</label>
              <input
                type="number"
                step="any"
                className={inputClass}
                value={row.quantity}
                onChange={(e) => {
                  const next = [...variances];
                  next[idx] = { ...row, quantity: e.target.value };
                  setVariances(next);
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Reason</label>
              <select
                className={inputClass}
                value={row.reason}
                onChange={(e) => {
                  const next = [...variances];
                  next[idx] = { ...row, reason: e.target.value };
                  setVariances(next);
                }}
              >
                {VARIANCE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={row.notes}
                  onChange={(e) => {
                    const next = [...variances];
                    next[idx] = { ...row, notes: e.target.value };
                    setVariances(next);
                  }}
                />
                <button
                  type="button"
                  className="mt-1 shrink-0 text-xs text-red-600 hover:underline"
                  onClick={() => setVariances(variances.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {variances.length === 0 ? (
          <p className="text-xs text-slate-500">No variance lines.</p>
        ) : null}
      </div>
    </section>
  );
}
