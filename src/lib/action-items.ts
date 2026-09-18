export const ACTION_ITEM_STATUSES = ["Open", "Done"] as const;
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

export const ACTION_ITEM_TABS = ["open", "completed"] as const;
export type ActionItemTab = (typeof ACTION_ITEM_TABS)[number];

export function parseActionItemTab(value: string | undefined | null): ActionItemTab {
  return value === "completed" ? "completed" : "open";
}

export function actionItemsPath(tab: ActionItemTab = "open"): string {
  return tab === "completed" ? "/action-items?tab=completed" : "/action-items";
}

export function actionItemsForTab<T extends { status: string }>(
  items: T[],
  tab: ActionItemTab,
): T[] {
  const wanted = tab === "open" ? "Open" : "Done";
  return items.filter((item) => item.status === wanted);
}

export const ACTION_ITEM_OVERDUE_DAYS = 3;

const MS_PER_DAY = 86_400_000;

export function isActionItemStatus(value: string): value is ActionItemStatus {
  return (ACTION_ITEM_STATUSES as readonly string[]).includes(value);
}

/** UTC midnight for the calendar day of `d`. */
export function utcCalendarDayMs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole calendar days from `from` to `to` in UTC (can be negative if `from` is later). */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.floor((utcCalendarDayMs(to) - utcCalendarDayMs(from)) / MS_PER_DAY);
}

/**
 * Open days while status is Open: calendar days from the item date to `today`.
 * Returns null when Completed so the UI can show "—".
 * Future start dates clamp to 0.
 */
export function actionItemOpenDays(
  item: { date: Date; status: string },
  today: Date = new Date(),
): number | null {
  if (item.status !== "Open") return null;
  return Math.max(0, calendarDaysBetween(item.date, today));
}

export function formatOpenDays(days: number | null): string {
  return days === null ? "—" : String(days);
}

export function isActionItemOverdue(days: number | null): boolean {
  return days !== null && days >= ACTION_ITEM_OVERDUE_DAYS;
}

export type ActionItemInput = {
  date: string;
  task: string;
  assignedTo: string | null;
  notes: string | null;
};

export function parseActionItemInput(form: {
  date?: string;
  task?: string;
  assignedTo?: string;
  notes?: string;
}): { ok: true; data: ActionItemInput } | { ok: false; error: string } {
  const date = String(form.date ?? "").trim();
  const task = String(form.task ?? "").trim();
  const assignedTo = String(form.assignedTo ?? "").trim() || null;
  const notes = String(form.notes ?? "").trim() || null;

  if (!date) return { ok: false, error: "Date is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Date must be YYYY-MM-DD." };
  if (!task) return { ok: false, error: "Task is required." };

  return { ok: true, data: { date, task, assignedTo, notes } };
}

export function applyComplete(now: Date): { status: "Done"; completedAt: Date } {
  return { status: "Done", completedAt: now };
}

export function applyReopen(): { status: "Open"; completedAt: null } {
  return { status: "Open", completedAt: null };
}
