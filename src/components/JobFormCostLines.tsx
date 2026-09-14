"use client";

export type LodgingRow = {
  key: string;
  amount: string;
  facility: string;
  notes: string;
};

export type FreightRow = {
  key: string;
  company: string;
  cost: string;
  notes: string;
};

export type MiscRow = {
  key: string;
  amount: string;
  category: string;
  notes: string;
};

type Props = {
  lodging: LodgingRow[];
  setLodging: (rows: LodgingRow[]) => void;
  freight: FreightRow[];
  setFreight: (rows: FreightRow[]) => void;
  misc: MiscRow[];
  setMisc: (rows: MiscRow[]) => void;
  inputClass: string;
  labelClass: string;
  newKey: () => string;
};

export function JobFormCostLines({
  lodging,
  setLodging,
  freight,
  setFreight,
  misc,
  setMisc,
  inputClass,
  labelClass,
  newKey,
}: Props) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold text-slate-900">Cost lines</h2>
        <p className="text-xs text-slate-500">
          Lodging, freight, and misc are line items (P&amp;L sums them). Leave blank rows empty
          to skip.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-800">Lodging</h3>
          <button
            type="button"
            className="text-xs text-blue-700 hover:underline"
            onClick={() =>
              setLodging([...lodging, { key: newKey(), amount: "", facility: "", notes: "" }])
            }
          >
            + Add lodging
          </button>
        </div>
        <div className="space-y-2">
          {lodging.map((row, idx) => (
            <div key={row.key} className="grid gap-2 sm:grid-cols-4">
              <div>
                <label className={labelClass}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={row.amount}
                  onChange={(e) => {
                    const next = [...lodging];
                    next[idx] = { ...row, amount: e.target.value };
                    setLodging(next);
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Hotel / facility</label>
                <input
                  className={inputClass}
                  value={row.facility}
                  onChange={(e) => {
                    const next = [...lodging];
                    next[idx] = { ...row, facility: e.target.value };
                    setLodging(next);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes</label>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={row.notes}
                    onChange={(e) => {
                      const next = [...lodging];
                      next[idx] = { ...row, notes: e.target.value };
                      setLodging(next);
                    }}
                  />
                  <button
                    type="button"
                    className="mt-1 shrink-0 text-xs text-red-600 hover:underline"
                    onClick={() => setLodging(lodging.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          {lodging.length === 0 ? (
            <p className="text-xs text-slate-500">No lodging lines.</p>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-800">Freight</h3>
          <button
            type="button"
            className="text-xs text-blue-700 hover:underline"
            onClick={() =>
              setFreight([...freight, { key: newKey(), company: "", cost: "", notes: "" }])
            }
          >
            + Add freight
          </button>
        </div>
        <div className="space-y-2">
          {freight.map((row, idx) => (
            <div key={row.key} className="grid gap-2 sm:grid-cols-4">
              <div>
                <label className={labelClass}>Company</label>
                <input
                  className={inputClass}
                  value={row.company}
                  onChange={(e) => {
                    const next = [...freight];
                    next[idx] = { ...row, company: e.target.value };
                    setFreight(next);
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Cost</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={row.cost}
                  onChange={(e) => {
                    const next = [...freight];
                    next[idx] = { ...row, cost: e.target.value };
                    setFreight(next);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes</label>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={row.notes}
                    onChange={(e) => {
                      const next = [...freight];
                      next[idx] = { ...row, notes: e.target.value };
                      setFreight(next);
                    }}
                  />
                  <button
                    type="button"
                    className="mt-1 shrink-0 text-xs text-red-600 hover:underline"
                    onClick={() => setFreight(freight.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          {freight.length === 0 ? (
            <p className="text-xs text-slate-500">No freight lines.</p>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-800">Misc</h3>
          <button
            type="button"
            className="text-xs text-blue-700 hover:underline"
            onClick={() =>
              setMisc([...misc, { key: newKey(), amount: "", category: "", notes: "" }])
            }
          >
            + Add misc
          </button>
        </div>
        <div className="space-y-2">
          {misc.map((row, idx) => (
            <div key={row.key} className="grid gap-2 sm:grid-cols-4">
              <div>
                <label className={labelClass}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={row.amount}
                  onChange={(e) => {
                    const next = [...misc];
                    next[idx] = { ...row, amount: e.target.value };
                    setMisc(next);
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Category / description</label>
                <input
                  className={inputClass}
                  value={row.category}
                  placeholder="Fuel, PPE, etc."
                  onChange={(e) => {
                    const next = [...misc];
                    next[idx] = { ...row, category: e.target.value };
                    setMisc(next);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes</label>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={row.notes}
                    onChange={(e) => {
                      const next = [...misc];
                      next[idx] = { ...row, notes: e.target.value };
                      setMisc(next);
                    }}
                  />
                  <button
                    type="button"
                    className="mt-1 shrink-0 text-xs text-red-600 hover:underline"
                    onClick={() => setMisc(misc.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          {misc.length === 0 ? <p className="text-xs text-slate-500">No misc lines.</p> : null}
        </div>
      </div>
    </section>
  );
}
