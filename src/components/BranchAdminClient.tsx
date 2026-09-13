"use client";

import { useState, useTransition } from "react";
import {
  createBranch,
  updateBranch,
  removeBranch,
  reactivateBranch,
} from "@/app/admin/branches/actions";

type BranchRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  _count: {
    jobs: number;
    employees: number;
    inventoryItems: number;
    adjustments: number;
  };
};

type Props = { branches: BranchRow[] };

const emptyForm = { code: "", name: "", active: "true" };

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function BranchAdminClient({ branches }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [pending, startTransition] = useTransition();
  const [showInactive, setShowInactive] = useState(false);
  const visible = branches.filter((b) => showInactive || b.active);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function startEdit(b: BranchRow) {
    setEditingId(b.id);
    setForm({ code: b.code, name: b.name, active: b.active ? "true" : "false" });
    setError(null);
    setInfo(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError(null);
    setInfo(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (editingId) fd.set("id", editingId);
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const result = editingId ? await updateBranch(fd) : await createBranch(fd);
      if (!result.ok) {
        setError(result.error);
        setInfo(null);
        return;
      }
      setError(null);
      setInfo(null);
      cancelEdit();
    });
  }

  function onRemove(b: BranchRow) {
    const inUse =
      b._count.jobs + b._count.employees + b._count.inventoryItems + b._count.adjustments > 0;
    const confirmMsg = inUse
      ? `"${b.code}" is still referenced by jobs/employees/inventory. Remove will deactivate it (not hard-delete). Continue?`
      : `Permanently delete unused branch "${b.code}" (${b.name})?`;
    if (!window.confirm(confirmMsg)) return;
    const fd = new FormData();
    fd.set("id", b.id);
    startTransition(async () => {
      const result = await removeBranch(fd);
      if (!result.ok) {
        setError(result.error);
        setInfo(null);
        return;
      }
      setError(null);
      if (result.mode === "deactivated") setInfo(result.message);
      else setInfo(`Deleted "${b.code}".`);
      if (editingId === b.id) cancelEdit();
    });
  }

  function onReactivate(b: BranchRow) {
    const fd = new FormData();
    fd.set("id", b.id);
    startTransition(async () => {
      const result = await reactivateBranch(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setInfo(`Reactivated "${b.code}".`);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">
          {editingId ? "Edit yard / branch" : "Add yard / branch"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Code is stored uppercase and must be unique (e.g. DAV, MIA). New yards appear in job,
          employee, inventory, filter, and analytics dropdowns.
        </p>
        {error ? (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {info ? (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{info}</p>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Code *</span>
            <input
              required
              value={form.code}
              onChange={(ev) => set("code", ev.target.value.toUpperCase())}
              placeholder="DAV"
              className={"mt-1 font-mono uppercase " + inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Name *</span>
            <input
              required
              value={form.name}
              onChange={(ev) => set("name", ev.target.value)}
              placeholder="Davie Yard"
              className={"mt-1 " + inputCls}
            />
          </label>
          {editingId ? (
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Status</span>
              <select
                value={form.active}
                onChange={(ev) => set("active", ev.target.value)}
                className={"mt-1 " + inputCls}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Saving..." : editingId ? "Save changes" : "Create"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-slate-900">Yards / branches</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(ev) => setShowInactive(ev.target.checked)}
          />
          Show inactive
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium text-right">Jobs</th>
              <th className="px-3 py-2 font-medium text-right">Employees</th>
              <th className="px-3 py-2 font-medium text-right">Inv. items</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono font-medium text-slate-900">{b.code}</td>
                <td className="px-3 py-2">{b.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{b._count.jobs}</td>
                <td className="px-3 py-2 text-right tabular-nums">{b._count.employees}</td>
                <td className="px-3 py-2 text-right tabular-nums">{b._count.inventoryItems}</td>
                <td className="px-3 py-2">
                  {b.active ? (
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
                      onClick={() => startEdit(b)}
                      className="text-blue-700 hover:underline"
                    >
                      Edit
                    </button>
                    {b.active ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onRemove(b)}
                        className="text-red-700 hover:underline disabled:opacity-60"
                      >
                        Remove
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onReactivate(b)}
                          className="text-emerald-700 hover:underline disabled:opacity-60"
                        >
                          Reactivate
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onRemove(b)}
                          className="text-red-700 hover:underline disabled:opacity-60"
                          title="Deletes only if unused"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No branches to show.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
