"use client";

import { useState, useTransition } from "react";
import {
  createInventoryItem,
  updateInventoryItem,
  createAdjustment,
} from "@/app/admin/inventory/actions";

type Branch = { id: string; code: string; name: string; active?: boolean };
type Item = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  reusable: boolean;
  active?: boolean;
  branchId: string;
  startingQty: number;
  unitCost: number;
  branch: Branch;
};

const emptyItem = {
  sku: "",
  name: "",
  description: "",
  unit: "ea",
  reusable: "true",
  branchId: "",
  startingQty: "0",
  unitCost: "0",
};

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function InventoryItemForm({
  branches,
  editing,
  onCancel,
  onSaved,
}: {
  branches: Branch[];
  editing: Item | null;
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(
    editing
      ? {
          sku: editing.sku,
          name: editing.name,
          description: editing.description ?? "",
          unit: editing.unit,
          reusable: editing.reusable ? "true" : "false",
          branchId: editing.branchId,
          startingQty: String(editing.startingQty),
          unitCost: String(editing.unitCost),
        }
      : { ...emptyItem, branchId: branches[0]?.id ?? "" }
  );
  const [pending, startTransition] = useTransition();
  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const result = editing
        ? await updateInventoryItem(fd)
        : await createInventoryItem(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      (onSaved ?? onCancel)();
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-medium text-slate-900">
        {editing ? "Edit catalog item" : "Add catalog item"}
      </h2>
      {error ? (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">SKU *</span>
          <input required value={form.sku} onChange={(ev) => setF("sku", ev.target.value)} className={"mt-1 font-mono " + inputCls} /></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Name *</span>
          <input required value={form.name} onChange={(ev) => setF("name", ev.target.value)} className={"mt-1 " + inputCls} /></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Branch *</span>
          <select required value={form.branchId} onChange={(ev) => setF("branchId", ev.target.value)} className={"mt-1 " + inputCls}>
            {branches.filter((b) => b.active !== false || b.id === form.branchId).map((b) => (
              <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
            ))}
          </select></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Description</span>
          <input value={form.description} onChange={(ev) => setF("description", ev.target.value)} className={"mt-1 " + inputCls} /></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Unit</span>
          <input value={form.unit} onChange={(ev) => setF("unit", ev.target.value)} className={"mt-1 " + inputCls} /></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Reusable</span>
          <select value={form.reusable} onChange={(ev) => setF("reusable", ev.target.value)} className={"mt-1 " + inputCls}>
            <option value="true">Yes</option>
            <option value="false">No (consumable)</option>
          </select></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Starting qty</span>
          <input type="number" min={0} step="any" value={form.startingQty} onChange={(ev) => setF("startingQty", ev.target.value)} className={"mt-1 " + inputCls} /></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Unit cost</span>
          <input type="number" min={0} step="0.01" value={form.unitCost} onChange={(ev) => setF("unitCost", ev.target.value)} className={"mt-1 " + inputCls} /></label>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
          {pending ? "Saving..." : editing ? "Save changes" : "Create item"}
        </button>
        {editing ? (
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
        ) : null}
      </div>
    </form>
  );
}

export function AdjustmentForm({ items }: { items: Item[] }) {
  const [adjError, setAdjError] = useState<string | null>(null);
  const [adj, setAdj] = useState({
    inventoryItemId: items.find((i) => i.active !== false)?.id ?? "",
    quantityDelta: "",
    reason: "",
    adjustedAt: new Date().toISOString().slice(0, 10),
  });
  const [pending, startTransition] = useTransition();
  const setA = (k: string, v: string) => setAdj((a) => ({ ...a, [k]: v }));

  function onSubmitAdj(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(adj).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const result = await createAdjustment(fd);
      if (!result.ok) {
        setAdjError(result.error);
        return;
      }
      setAdjError(null);
      setAdj((a) => ({ ...a, quantityDelta: "", reason: "" }));
    });
  }

  return (
    <form onSubmit={onSubmitAdj} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-medium text-slate-900">Manual inventory adjustment</h2>
      <p className="mt-1 text-xs text-slate-500">Positive delta adds to on-hand; negative removes.</p>
      {adjError ? (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{adjError}</p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Item *</span>
          <select required value={adj.inventoryItemId} onChange={(ev) => setA("inventoryItemId", ev.target.value)} className={"mt-1 " + inputCls}>
            {items.filter((i) => i.active !== false).map((i) => (
              <option key={i.id} value={i.id}>{i.branch.code} / {i.sku} - {i.name}</option>
            ))}
          </select></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Qty delta *</span>
          <input required type="number" step="any" value={adj.quantityDelta} onChange={(ev) => setA("quantityDelta", ev.target.value)} className={"mt-1 " + inputCls} placeholder="e.g. -5 or 12" /></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Date</span>
          <input type="date" value={adj.adjustedAt} onChange={(ev) => setA("adjustedAt", ev.target.value)} className={"mt-1 " + inputCls} /></label>
        <label className="block text-sm"><span className="text-xs font-medium text-slate-600">Reason / note</span>
          <input value={adj.reason} onChange={(ev) => setA("reason", ev.target.value)} className={"mt-1 " + inputCls} placeholder="Cycle count, damage..." /></label>
      </div>
      <button type="submit" disabled={pending || items.length === 0} className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
        Post adjustment
      </button>
    </form>
  );
}
