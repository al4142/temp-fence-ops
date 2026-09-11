"use client";

type LaborRow = {
  key: string;
  employeeId: string;
  regularHours: string;
  overtimeHours: string;
};

type EmployeeOption = {
  id: string;
  name: string;
  position: string;
  branchId: string;
  active: boolean;
};

type Props = {
  labor: LaborRow[];
  setLabor: (updater: LaborRow[] | ((prev: LaborRow[]) => LaborRow[])) => void;
  filteredEmployees: EmployeeOption[];
  inputClass: string;
  labelClass: string;
  newKey: () => string;
};

export function JobFormLabor({
  labor,
  setLabor,
  filteredEmployees,
  inputClass,
  labelClass,
  newKey,
}: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Labor</h2>
          <p className="text-xs text-slate-500">
            Same-branch employees listed first. OT uses 1.5x in P&amp;L.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
          onClick={() =>
            setLabor((rows) => [
              ...rows,
              {
                key: newKey(),
                employeeId: "",
                regularHours: "8",
                overtimeHours: "0",
              },
            ])
          }
        >
          Add row
        </button>
      </div>
      <div className="space-y-3">
        {labor.map((row, idx) => (
          <div
            key={row.key}
            className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 sm:grid-cols-12"
          >
            <div className="sm:col-span-5">
              <label className={labelClass}>Employee</label>
              <select
                className={inputClass}
                value={row.employeeId}
                onChange={(e) =>
                  setLabor((rows) =>
                    rows.map((r, i) =>
                      i === idx ? { ...r, employeeId: e.target.value } : r
                    )
                  )
                }
              >
                <option value="">Select employee</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.position}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className={labelClass}>Regular hours</label>
              <input
                type="number"
                step="0.25"
                min="0"
                className={inputClass}
                value={row.regularHours}
                onChange={(e) =>
                  setLabor((rows) =>
                    rows.map((r, i) =>
                      i === idx ? { ...r, regularHours: e.target.value } : r
                    )
                  )
                }
              />
            </div>
            <div className="sm:col-span-3">
              <label className={labelClass}>OT hours</label>
              <input
                type="number"
                step="0.25"
                min="0"
                className={inputClass}
                value={row.overtimeHours}
                onChange={(e) =>
                  setLabor((rows) =>
                    rows.map((r, i) =>
                      i === idx ? { ...r, overtimeHours: e.target.value } : r
                    )
                  )
                }
              />
            </div>
            <div className="flex items-end sm:col-span-1">
              <button
                type="button"
                className="mb-0.5 w-full rounded-md px-2 py-2 text-sm text-red-700 hover:bg-red-50"
                onClick={() => setLabor((rows) => rows.filter((_, i) => i !== idx))}
                disabled={labor.length <= 1}
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
