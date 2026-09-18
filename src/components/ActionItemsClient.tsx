"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  completeActionItem,
  createActionItem,
  deleteActionItem,
  reopenActionItem,
  updateActionItem,
} from "@/app/action-items/actions";
import { ActionItemStatusBadge } from "@/components/ActionItemStatusBadge";
import {
  actionItemsForTab,
  actionItemsPath,
  formatOpenDays,
  isActionItemOverdue,
  type ActionItemTab,
} from "@/lib/action-items";

export type ActionItemRow = {
  id: string;
  date: string;
  dateInput: string;
  task: string;
  assignedTo: string | null;
  notes: string | null;
  status: string;
  completedDate: string | null;
  openDays: number | null;
};

type Props = {
  items: ActionItemRow[];
  today: string;
  employeeNames: string[];
  tab: ActionItemTab;
};

const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

const emptyForm = {
  date: "",
  task: "",
  assignedTo: "",
  notes: "",
};

export function ActionItemsClient({ items, today, employeeNames, tab }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, date: today });

  const openCount = actionItemsForTab(items, "open").length;
  const completedCount = actionItemsForTab(items, "completed").length;
  const visible = actionItemsForTab(items, tab);
  const showForm = tab === "open" || Boolean(editingId);

  function startEdit(item: ActionItemRow) {
    setEditingId(item.id);
    setForm({
      date: item.dateInput,
      task: item.task,
      assignedTo: item.assignedTo ?? "",
      notes: item.notes ?? "",
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForm, date: today });
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (editingId) fd.set("id", editingId);
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const result = editingId ? await updateActionItem(fd) : await createActionItem(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      cancelEdit();
      if (!editingId) router.push(actionItemsPath("open"));
    });
  }

  function run(
    action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>,
    id: string,
    afterTab?: ActionItemTab,
  ) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await action(fd);
      if (!result.ok) {
        setError(result.error ?? "Request failed.");
        return;
      }
      if (afterTab) router.push(actionItemsPath(afterTab));
    });
  }

  return (
    <div className="space-y-6">
      {showForm ? (
        <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">
            {editingId ? "Edit action item" : "Add action item"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Date is the start date used for open days. Assigned to is free text (employee names
            suggested). New items start as Open.
          </p>
          {error ? (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Date *</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Task *</span>
              <input
                required
                value={form.task}
                onChange={(e) => setForm({ ...form, task: e.target.value })}
                className={inputCls}
                placeholder="What needs to get done"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Assigned to</span>
              <input
                list="action-item-assignees"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                className={inputCls}
                placeholder="Name"
              />
              <datalist id="action-item-assignees">
                {employeeNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Notes</span>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputCls}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {pending ? "Saving..." : editingId ? "Save changes" : "Add action item"}
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
      ) : error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div>
        <nav className="flex gap-1 border-b border-slate-200" aria-label="Action item status">
          {(
            [
              { key: "open" as const, label: "Open", count: openCount },
              { key: "completed" as const, label: "Completed", count: completedCount },
            ] as const
          ).map((t) => {
            const active = tab === t.key;
            return (
              <Link
                key={t.key}
                href={actionItemsPath(t.key)}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "-mb-px border-b-2 border-blue-700 px-3 py-2 text-sm font-medium text-slate-900"
                    : "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800"
                }
              >
                {t.label}
                <span className="ml-1.5 tabular-nums text-slate-500">{t.count}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Task</th>
              <th className="px-3 py-2">Assigned to</th>
              <th className="px-3 py-2">Notes</th>
              {tab === "open" ? (
                <th className="whitespace-nowrap px-3 py-2 text-right">Open days</th>
              ) : (
                <th className="px-3 py-2">Completed</th>
              )}
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((item) => {
              const overdue = tab === "open" && isActionItemOverdue(item.openDays);
              return (
                <tr
                  key={item.id}
                  className={overdue ? "bg-amber-50/70 hover:bg-amber-50" : "hover:bg-slate-50"}
                >
                  <td className="whitespace-nowrap px-3 py-2">{item.date}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{item.task}</td>
                  <td className="px-3 py-2">{item.assignedTo ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{item.notes ?? ""}</td>
                  {tab === "open" ? (
                    <td
                      className={
                        overdue
                          ? "px-3 py-2 text-right tabular-nums font-medium text-amber-900"
                          : "px-3 py-2 text-right tabular-nums text-slate-700"
                      }
                    >
                      {formatOpenDays(item.openDays)}
                    </td>
                  ) : (
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {item.completedDate ?? "—"}
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <ActionItemStatusBadge status={item.status} openDays={item.openDays} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <RowActions
                      item={item}
                      pending={pending}
                      onEdit={() => startEdit(item)}
                      onComplete={() => run(completeActionItem, item.id, "completed")}
                      onReopen={() => run(reopenActionItem, item.id, "open")}
                      onDelete={() => {
                        if (!window.confirm("Delete this action item?")) return;
                        run(deleteActionItem, item.id);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  {tab === "open" ? "No open action items." : "No completed action items."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {visible.map((item) => {
          const overdue = tab === "open" && isActionItemOverdue(item.openDays);
          return (
            <li
              key={item.id}
              className={
                overdue
                  ? "rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm"
                  : "rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{item.task}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.date}</p>
                </div>
                <ActionItemStatusBadge status={item.status} openDays={item.openDays} />
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Assigned to</dt>
                  <dd>{item.assignedTo ?? "—"}</dd>
                </div>
                {tab === "open" ? (
                  <div>
                    <dt className="text-xs text-slate-500">Open days</dt>
                    <dd className={overdue ? "font-medium text-amber-900" : ""}>
                      {formatOpenDays(item.openDays)}
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt className="text-xs text-slate-500">Completed</dt>
                    <dd>{item.completedDate ?? "—"}</dd>
                  </div>
                )}
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Notes</dt>
                  <dd className="text-slate-600">{item.notes || "—"}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <RowActions
                  item={item}
                  pending={pending}
                  onEdit={() => startEdit(item)}
                  onComplete={() => run(completeActionItem, item.id, "completed")}
                  onReopen={() => run(reopenActionItem, item.id, "open")}
                  onDelete={() => {
                    if (!window.confirm("Delete this action item?")) return;
                    run(deleteActionItem, item.id);
                  }}
                />
              </div>
            </li>
          );
        })}
        {visible.length === 0 ? (
          <li className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            {tab === "open" ? "No open action items." : "No completed action items."}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function RowActions({
  item,
  pending,
  onEdit,
  onComplete,
  onReopen,
  onDelete,
}: {
  item: ActionItemRow;
  pending: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 text-sm">
      <button type="button" onClick={onEdit} className="text-blue-700 hover:underline">
        Edit
      </button>
      {item.status === "Open" ? (
        <button
          type="button"
          disabled={pending}
          onClick={onComplete}
          className="text-emerald-700 hover:underline disabled:opacity-60"
        >
          Mark done
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={onReopen}
          className="text-amber-700 hover:underline disabled:opacity-60"
        >
          Reopen
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        className="text-red-700 hover:underline disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  );
}
