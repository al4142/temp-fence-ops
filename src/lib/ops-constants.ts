export const YARD_EXPENSE_CATEGORIES = [
  "PPE",
  "Consumables",
  "Tools",
  "Food",
  "Equipment",
  "Other",
] as const;

export type YardExpenseCategory = (typeof YARD_EXPENSE_CATEGORIES)[number];

export const WRITEOFF_REASONS = ["damaged", "scrap", "shrink"] as const;
export type WriteOffReason = (typeof WRITEOFF_REASONS)[number];

export const VARIANCE_REASONS = [
  "damaged on site",
  "lost",
  "extra used",
  "returned unused",
] as const;
export type VarianceReason = (typeof VARIANCE_REASONS)[number];
