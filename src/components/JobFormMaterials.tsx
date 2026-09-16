"use client";

import type { BomResult, MatchedBomMaterial } from "@/lib/bom";

type MaterialRow = {
  key: string;
  inventoryItemId: string;
  itemName: string;
  quantity: string;
  notes: string;
};

type InventoryOption = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  branchId: string;
};

type Props = {
  materials: MaterialRow[];
  setMaterials: (updater: MaterialRow[] | ((prev: MaterialRow[]) => MaterialRow[])) => void;
  filteredInventory: InventoryOption[];
  inputClass: string;
  labelClass: string;
  newKey: () => string;
  bomPreview: { result: BomResult; materials: MatchedBomMaterial[] } | null;
  onGenerateBom: () => void;
  onApplyBom: () => void;
  onDismissBom: () => void;
};

export function JobFormMaterials({
  materials,
  setMaterials,
  filteredInventory,
  inputClass,
  labelClass,
  newKey,
  bomPreview,
  onGenerateBom,
  onApplyBom,
  onDismissBom,
}: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Materials</h2>
          <p className="text-xs text-slate-500">
            Catalog items are filtered by branch when possible. Leave item blank and type a
            free-text name if needed. Generate BOM previews lines from fence type + LF +
            options; it does not save until you apply and submit the job.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-900 hover:bg-blue-100"
            onClick={onGenerateBom}
          >
            Generate BOM
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
            onClick={() =>
              setMaterials((rows) => [
                ...rows,
                { key: newKey(), inventoryItemId: "", itemName: "", quantity: "1", notes: "" },
              ])
            }
          >
            Add row
          </button>
        </div>
      </div>

      {bomPreview ? (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">BOM preview</h3>
              <p className="text-xs text-slate-600">
                {bomPreview.materials.length} line
                {bomPreview.materials.length === 1 ? "" : "s"}
                {bomPreview.result.terminalsTotal
                  ? ` · terminals ${bomPreview.result.terminalsTotal}`
                  : ""}
                . Apply replaces the material rows below (you will be asked to confirm if
                rows already exist).
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                onClick={onApplyBom}
                disabled={bomPreview.materials.length === 0}
              >
                Apply to materials
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                onClick={onDismissBom}
              >
                Dismiss
              </button>
            </div>
          </div>
          {bomPreview.result.warnings.length > 0 ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-900">
              {bomPreview.result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {bomPreview.materials.length > 0 ? (
            <table className="mt-2 min-w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 pr-2">Item</th>
                  <th className="py-1 pr-2">Qty</th>
                  <th className="py-1">Match</th>
                </tr>
              </thead>
              <tbody>
                {bomPreview.materials.map((m) => (
                  <tr key={m.skuOrName} className="border-t border-blue-100">
                    <td className="py-1 pr-2 font-medium text-slate-800">{m.skuOrName}</td>
                    <td className="py-1 pr-2 tabular-nums">{m.quantity}</td>
                    <td className="py-1 text-slate-600">
                      {m.catalogMatched ? "catalog" : "free-text"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-xs text-slate-600">No material lines generated.</p>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        {materials.map((row, idx) => (
          <div
            key={row.key}
            className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 sm:grid-cols-12"
          >
            <div className="sm:col-span-4">
              <label className={labelClass}>Inventory item</label>
              <select
                className={inputClass}
                value={row.inventoryItemId}
                onChange={(e) => {
                  const id = e.target.value;
                  setMaterials((rows) =>
                    rows.map((r, i) =>
                      i === idx
                        ? {
                            ...r,
                            inventoryItemId: id,
                            itemName: id ? "" : r.itemName,
                          }
                        : r
                    )
                  );
                }}
              >
                <option value="">- free-text / none -</option>
                {filteredInventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} - {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className={labelClass}>Free-text name</label>
              <input
                className={inputClass}
                disabled={Boolean(row.inventoryItemId)}
                value={row.itemName}
                onChange={(e) =>
                  setMaterials((rows) =>
                    rows.map((r, i) => (i === idx ? { ...r, itemName: e.target.value } : r))
                  )
                }
                placeholder="Optional if catalog selected"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Qty</label>
              <input
                type="number"
                step="any"
                min="0"
                className={inputClass}
                value={row.quantity}
                onChange={(e) =>
                  setMaterials((rows) =>
                    rows.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r))
                  )
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Notes</label>
              <input
                className={inputClass}
                value={row.notes}
                onChange={(e) =>
                  setMaterials((rows) =>
                    rows.map((r, i) => (i === idx ? { ...r, notes: e.target.value } : r))
                  )
                }
              />
            </div>
            <div className="flex items-end sm:col-span-1">
              <button
                type="button"
                className="mb-0.5 w-full rounded-md px-2 py-2 text-sm text-red-700 hover:bg-red-50"
                onClick={() => setMaterials((rows) => rows.filter((_, i) => i !== idx))}
                disabled={materials.length <= 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
