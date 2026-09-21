import { isCancelledStatus } from "@/lib/job-constants";

export function JobStatusBadge({ status }: { status?: string | null }) {
  if (!isCancelledStatus(status)) return null;
  return (
    <span className="inline-flex rounded bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-800">
      Cancelled
    </span>
  );
}
