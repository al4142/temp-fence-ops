import { isActionItemOverdue } from "@/lib/action-items";

export function ActionItemStatusBadge({
  status,
  openDays,
}: {
  status: string;
  openDays: number | null;
}) {
  if (status === "Done") {
    return (
      <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
        Done
      </span>
    );
  }

  const overdue = isActionItemOverdue(openDays);
  return (
    <span
      className={
        overdue
          ? "inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900"
          : "inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800"
      }
    >
      Open
    </span>
  );
}
