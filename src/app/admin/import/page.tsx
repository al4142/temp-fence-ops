import Link from "next/link";
import { ImportClient } from "@/components/ImportClient";

export const dynamic = "force-dynamic";

export default function AdminImportPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">CSV import</h1>
        <p className="mt-1 text-sm text-slate-600">
          Import daily tracker rows into Jobs. Dry-run first, then commit. Idempotent by{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">orderNumber + date</code>. Sample
          template:{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">docs/import-template.csv</code> — see{" "}
          <Link
            href="https://github.com/al4142/temp-fence-ops/blob/main/docs/IMPORT.md"
            className="text-blue-700 hover:underline"
            target="_blank"
          >
            docs/IMPORT.md
          </Link>
          .
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
