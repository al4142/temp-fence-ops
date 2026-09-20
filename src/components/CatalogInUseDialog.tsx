"use client";

import type { CatalogNamedRef } from "@/lib/inventory-catalog";

type Props = {
  sku: string;
  title: string;
  body: string;
  refs: CatalogNamedRef[];
  pending?: boolean;
  onCancel: () => void;
  onDeactivate: () => void;
};

/** In-use catalog delete only. Never used for unused SKUs. */
export function CatalogInUseDialog({
  sku,
  title,
  body,
  refs,
  pending,
  onCancel,
  onDeactivate,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      data-catalog-delete-dialog="in-use"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-in-use-title"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="catalog-in-use-title" className="text-lg font-semibold text-slate-900">
          {title || `${sku} is in use`}
        </h3>
        <p className="mt-2 text-sm text-slate-700">{body}</p>
        {refs.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {refs.slice(0, 12).map((ref, idx) => (
              <li key={`${ref.kind}-${ref.label}-${idx}`}>{ref.label}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onDeactivate}
            className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}
