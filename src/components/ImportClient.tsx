"use client";

import { useRef, useState, useTransition } from "react";
import {
  previewCsvImport,
  commitCsvImport,
  type ImportPreviewResult,
  type ImportCommitResult,
} from "@/app/admin/import/actions";

export function ImportClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [mode, setMode] = useState<"upsert" | "skip_existing">("upsert");
  const [preview, setPreview] = useState<Extract<ImportPreviewResult, { ok: true }> | null>(
    null
  );
  const [commit, setCommit] = useState<Extract<ImportCommitResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function buildFormData() {
    const fd = new FormData();
    const file = fileRef.current?.files?.[0];
    if (file) fd.set("file", file);
    if (csvText.trim()) fd.set("csvText", csvText);
    fd.set("mode", mode);
    return fd;
  }

  function onPreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCommit(null);
    startTransition(async () => {
      const result = await previewCsvImport(buildFormData());
      if (!result.ok) {
        setPreview(null);
        setError(result.error);
        return;
      }
      setPreview(result);
    });
  }

  function onCommit() {
    if (!preview) return;
    if (
      !confirm(
        `Commit ${preview.summary.accepted} accepted row(s) in one transaction? Mode: ${mode}`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await commitCsvImport(buildFormData());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCommit(result);
      const again = await previewCsvImport(buildFormData());
      if (again.ok) setPreview(again);
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onPreview}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-medium text-slate-900">Upload CSV</h2>
          <p className="mt-1 text-sm text-slate-600">
            From Excel Daily Tracker: <strong>File → Save As → CSV (UTF-8)</strong>. See{" "}
            <a href="https://github.com/al4142/temp-fence-ops/blob/main/docs/IMPORT.md" target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
              docs/IMPORT.md
            </a>{" "}
            and the sample template.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">CSV file</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="mt-1 block w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Or paste CSV</label>
          <textarea
            value={csvText}
            onChange={(ev) => setCsvText(ev.target.value)}
            rows={6}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
            placeholder="date,branch,orderNumber,customer,jobType,..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Existing jobs (same orderNumber + date)
          </label>
          <select
            value={mode}
            onChange={(ev) => setMode(ev.target.value as "upsert" | "skip_existing")}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="upsert">Update (upsert)</option>
            <option value="skip_existing">Skip existing</option>
          </select>
        </div>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Working…" : "Dry-run / preview"}
        </button>
      </form>

      {commit ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-medium">Import complete</p>
          <ul className="mt-1 list-inside list-disc">
            <li>Created: {commit.created}</li>
            <li>Updated: {commit.updated}</li>
            <li>Skipped: {commit.skipped}</li>
            <li>Errors: {commit.errors.length}</li>
          </ul>
          <p className="mt-2 text-emerald-800">{commit.materialsNote}</p>
          {commit.errors.length > 0 ? (
            <ul className="mt-2 max-h-40 overflow-auto text-xs text-red-800">
              {commit.errors.map((e) => (
                <li key={`${e.rowNumber}-${e.message}`}>
                  Row {e.rowNumber}: {e.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-slate-900">
              Preview ({preview.rows.length} rows)
            </h2>
            <button
              type="button"
              disabled={pending || preview.rows.length === 0 || preview.summary.rejected > 0}
              onClick={onCommit}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              Commit import
            </button>
          </div>

          {preview.parseErrors.length > 0 ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {preview.parseErrors.join(" · ")}
            </div>
          ) : null}

          <p className="text-xs text-slate-500">{preview.note}</p>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
              Total {preview.summary.total}
            </span>
            <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">
              Accept {preview.summary.accepted}
            </span>
            <span className="rounded bg-red-50 px-2 py-1 text-red-800">
              Reject {preview.summary.rejected}
            </span>
            <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">
              Create {preview.summary.create}
            </span>
            <span className="rounded bg-blue-50 px-2 py-1 text-blue-800">
              Update {preview.summary.update}
            </span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
              Skip {preview.summary.skip}
            </span>
          </div>
          {preview.summary.rejected > 0 ? (
            <p className="text-sm text-red-700">
              Commit is blocked until every row is accepted. Unknown job types are rejected — they
              are never stored as Other.
            </p>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-medium">Column mapping</p>
            <p className="mt-1 font-mono">
              {Object.entries(preview.mapping)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => `${k}←${preview.headers[v!]}`)
                .join(", ") || "(none)"}
            </p>
            {preview.materialColumns.length > 0 ? (
              <p className="mt-1">
                Material columns: {preview.materialColumns.map((m) => m.sku).join(", ")}
              </p>
            ) : (
              <p className="mt-1">No SKU-style material columns detected (core job fields only).</p>
            )}
            {preview.unmapped.length > 0 ? (
              <p className="mt-1 text-slate-500">
                Unmapped (ignored): {preview.unmapped.slice(0, 12).join(", ")}
                {preview.unmapped.length > 12 ? "…" : ""}
              </p>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2">Row</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Branch</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Original type</th>
                  <th className="px-2 py-2">Mapped type</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2 text-right">Rev</th>
                  <th className="px-2 py-2">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber} className="hover:bg-slate-50">
                    <td className="px-2 py-1.5">{r.rowNumber}</td>
                    <td className="px-2 py-1.5">
                      <ActionBadge action={r.action} />
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.date}</td>
                    <td className="px-2 py-1.5 font-medium">{r.orderNumber}</td>
                    <td className="px-2 py-1.5 font-mono">{r.branchCode}</td>
                    <td className="px-2 py-1.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-2 py-1.5 font-mono">{r.originalType || "—"}</td>
                    <td className="px-2 py-1.5 font-mono">{r.mappedType ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.customer}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.revenue}</td>
                    <td className="px-2 py-1.5 text-slate-600">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionBadge({ action }: { action?: string }) {
  const styles: Record<string, string> = {
    create: "bg-emerald-50 text-emerald-800",
    update: "bg-blue-50 text-blue-800",
    skip: "bg-slate-100 text-slate-600",
    error: "bg-red-50 text-red-800",
  };
  const cls = styles[action ?? ""] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded px-1.5 py-0.5 font-medium ${cls}`}>{action ?? "—"}</span>
  );
}

function StatusBadge({ status }: { status: "accept" | "reject" }) {
  const cls =
    status === "accept" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800";
  return <span className={`rounded px-1.5 py-0.5 font-medium ${cls}`}>{status}</span>;
}
