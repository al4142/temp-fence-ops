"use client";

import { useState, useTransition } from "react";
import {
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
} from "@/app/admin/employees/actions";

type Branch = { id: string; code: string; name: string; active?: boolean };
type Employee = {
  id: string;
  name: string;
  nameKey: string;
  hourlyRate: number;
  position: string;
  branchId: string;
  active: boolean;
  branch: Branch;
};

type Props = { branches: Branch[]; employees: Employee[] };

const emptyForm = {
  name: "",
  nameKey: "",
  hourlyRate: "20",
  position: "Installer",
  branchId: "",
  active: "true",
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function EmployeeAdminClient({ branches, employees }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, branchId: branches[0]?.id ?? "" });
  const [pending, startTransition] = useTransition();
  const [showInactive, setShowInactive] = useState(false);
  const visible = employees.filter((e) => showInactive || e.active);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function startEdit(e: Employee) {
    setEditingId(e.id);
    setForm({
      name: e.name,
      nameKey: e.nameKey,
      hourlyRate: String(e.hourlyRate),
      position: e.position,
      branchId: e.branchId,
      active: e.active ? "true" : "false",
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForm, branchId: branches[0]?.id ?? "" });
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (editingId) fd.set("id", editingId);
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const result = editingId ? await updateEmployee(fd) : await createEmployee(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      cancelEdit();
    });
  }

  function toggleActive(e: Employee) {
    const fd = new FormData();
    fd.set("id", e.id);
    startTransition(async () => {
      if (e.active) await deactivateEmployee(fd);
      else await reactivateEmployee(fd);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">
          {editingId ? "Edit employee" : "Add employee"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Ops fields only - no SSN, DOB, address, or phone.
        </p>
        {error ? (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Name *</span>
            <input required value={form.name} onChange={(ev) => set("name", ev.target.value)} className={"mt-1 " + inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">nameKey (slug)</span>
            <input value={form.nameKey} placeholder="auto from name if blank" onChange={(ev) => set("nameKey", ev.target.value)} className={"mt-1 font-mono " + inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Hourly rate *</span>
            <input required type="number" min={0} step="0.01" value={form.hourlyRate} onChange={(ev) => set("hourlyRate", ev.target.value)} className={"mt-1 " + inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Position *</span>
            <input required value={form.position} onChange={(ev) => set("position", ev.target.value)} className={"mt-1 " + inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Branch *</span>
            <select required value={form.branchId} onChange={(ev) => set("branchId", ev.target.value)} className={"mt-1 " + inputCls}>
              {branches.filter((b) => b.active !== false || b.id === form.branchId).map((b) => (
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
          </label>
          {editingId ? (
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Status</span>
              <select value={form.active} onChange={(ev) => set("active", ev.target.value)} className={"mt-1 " + inputCls}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {pending ? "Saving..." : editingId ? "Save changes" : "Create"}
          </button>
          {editingId ? (
            <button type="button" onClick={cancelEdit} className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          ) : null}
        </div>
      </form>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-slate-900">Employees</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(ev) => setShowInactive(ev.target.checked)} />
          Show inactive
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">nameKey</th>
              <th className="px-3 py-2 font-medium">Position</th>
              <th className="px-3 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 font-medium text-right">Rate</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{e.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{e.nameKey}</td>
                <td className="px-3 py-2">{e.position}</td>
                <td className="px-3 py-2">{e.branch.code}</td>
                <td className="px-3 py-2 text-right tabular-nums">${e.hourlyRate.toFixed(2)}</td>
                <td className="px-3 py-2">
                  {e.active ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800">Active</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">Inactive</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => startEdit(e)} className="text-blue-700 hover:underline">Edit</button>
                    <button type="button" disabled={pending} onClick={() => toggleActive(e)} className={e.active ? "text-amber-700 hover:underline" : "text-emerald-700 hover:underline"}>
                      {e.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
