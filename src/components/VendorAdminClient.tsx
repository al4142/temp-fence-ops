"use client";

import { useState, useTransition } from "react";
import {
  createVendor,
  updateVendor,
  deactivateVendor,
  reactivateVendor,
} from "@/app/admin/vendors/actions";

type VendorRow = {
  id: string;
  name: string;
  notes: string | null;
  active: boolean;
  _count: { yardExpenses: number };
};

type Props = { vendors: VendorRow[] };

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function VendorAdminClient({ vendors }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", notes: "", active: "true" });
  const [pending, startTransition] = useTransition();
  const [showInactive, setShowInactive] = useState(false);
  const visible = vendors.filter((v) => showInactive || v.active);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function startEdit(v: VendorRow) {
    setEditingId(v.id);
    setForm({
      name: v.name,
      notes: v.notes ?? "",
      active: v.active ? "true" : "false",
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", notes: "", active: "true" });
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (editingId) fd.set("id", editingId);
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const result = editingId ? await updateVendor(fd) : await createVendor(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      cancelEdit();
    });
  }

  function onDeactivate(v: VendorRow) {
    if (!window.confirm(`Deactivate vendor "${v.name}"?`)) return;
    const fd = new FormData();
    fd.set("id", v.id);
    startTransition(async () => {
      const result = await deactivateVendor(fd);
      if (!result.ok) setError(result.error);
      else if (editingId === v.id) cancelEdit();
    });
  }

  function onReactivate(v: VendorRow) {
    const fd = new FormData();
    fd.set("id", v.id);
    startTransition(async () => {
      const result = await reactivateVendor(fd);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">
          {editingId ? "Edit vendor" : "Add vendor"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Used on yard expenses now; purchases (Wave 2–3) will use this list too.
        </p>
        {error ? (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Name *</span>
            <input
              required
              value={form.name}
              onChange={(ev) => set("name", ev.target.value)}
              className={"mt-1 " + inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Notes</span>
            <input
              value={form.notes}
              onChange={(ev) => set("notes", ev.target.value)}
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
        <h2 className="text-lg font-medium text-slate-900">Vendors</h2>
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
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 font-medium text-right">Expenses</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{v.name}</td>
                <td className="px-3 py-2 text-slate-600">{v.notes ?? ""}</td>
                <td className="px-3 py-2 text-right tabular-nums">{v._count.yardExpenses}</td>
                <td className="px-3 py-2">
                  {v.active ? (
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
                      onClick={() => startEdit(v)}
                      className="text-blue-700 hover:underline"
                    >
                      Edit
                    </button>
                    {v.active ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onDeactivate(v)}
                        className="text-red-700 hover:underline disabled:opacity-60"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onReactivate(v)}
                        className="text-emerald-700 hover:underline disabled:opacity-60"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No vendors yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
