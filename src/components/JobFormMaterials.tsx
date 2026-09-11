"use client";

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
};

export function JobFormMaterials({
  materials,
  setMaterials,
  filteredInventory,
  inputClass,
  labelClass,
  newKey,
}: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Materials</h2>
          <p className="text-xs text-slate-500">
            Catalog items are filtered by branch when possible. Leave item blank and type a
            free-text name if needed.
          </p>
        </div>
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
