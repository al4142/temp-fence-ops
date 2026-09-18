export const JOB_TYPES = ["Install", "Pickup", "Drop", "Other"] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_CLASSES = ["EVENT", "CONSTRUCTION", "OTHER"] as const;

export function isJobType(value: string): value is JobType {
  return (JOB_TYPES as readonly string[]).includes(value);
}

/**
 * Canonical Title Case label when the input matches one of the four types
 * (case-insensitive). Unknown values are returned trimmed.
 */
export function normalizeJobType(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return JOB_TYPES.find((t) => t.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
}

/** Coerce to one of the four labels; unknown / blank → Other. */
export function canonicalJobType(raw: string): JobType {
  const normalized = normalizeJobType(raw);
  return isJobType(normalized) ? normalized : "Other";
}

export {
  FENCE_TYPES,
  FENCE_TYPE_LABELS,
  GATE_TYPES,
  SCREEN_SKUS,
  WEIGHT_MODES,
} from "./bom/catalog";
