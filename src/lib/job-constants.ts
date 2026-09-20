export const JOB_TYPES = ["Install", "Pickup", "Drop", "Other"] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_CLASSES = ["EVENT", "CONSTRUCTION", "OTHER"] as const;

/**
 * Import-only aliases from the Excel Daily Tracker / older CSVs.
 * Keys are matched case-insensitively after collapsing spaces/underscores to `-`.
 *
 * Form, inventory sign, and analytics stay Title Case only (`normalizeJobType`).
 * Unknown import codes must be rejected — never coerced to Other.
 */
export const IMPORT_JOB_TYPE_ALIASES: Record<string, JobType> = {
  INST: "Install",
  INSTALL: "Install",
  PU: "Pickup",
  PICKUP: "Pickup",
  "PICK-UP": "Pickup",
  RETURN: "Pickup",
  RET: "Pickup",
  DELIVERY: "Drop",
  DEL: "Drop",
  DROP: "Drop",
  OTHER: "Other",
};

export type ImportJobTypeMapResult =
  | { ok: true; original: string; mapped: JobType }
  | { ok: false; original: string; mapped: null; reason: string };

/** Collapse `PICK UP` / `pick_up` / `Pick-Up` to the alias-table key `PICK-UP`. */
export function importJobTypeAliasKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s_]+/g, "-");
}

/**
 * Map a CSV/Excel job-type cell for import.
 * Canonical labels and known legacy aliases succeed; blank/unknown reject.
 */
export function mapImportJobType(raw: string): ImportJobTypeMapResult {
  const original = raw.trim();
  if (!original) {
    return {
      ok: false,
      original: "",
      mapped: null,
      reason: "Job type is required.",
    };
  }

  const titled = JOB_TYPES.find((t) => t.toLowerCase() === original.toLowerCase());
  if (titled) return { ok: true, original, mapped: titled };

  const mapped = IMPORT_JOB_TYPE_ALIASES[importJobTypeAliasKey(original)];
  if (mapped) return { ok: true, original, mapped };

  return {
    ok: false,
    original,
    mapped: null,
    reason: `Unknown job type "${original}". Use Install, Pickup, Drop, or Other (or a known alias such as INST, PU, DELIVERY). Unknown codes are not coerced to Other.`,
  };
}

export function isJobType(value: string): value is JobType {
  return (JOB_TYPES as readonly string[]).includes(value);
}

/**
 * Canonical Title Case label when the input matches one of the four types
 * (case-insensitive). Unknown values are returned trimmed.
 * Does not apply import aliases — the job form rejects INST / PU / DELIVERY.
 */
export function normalizeJobType(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return JOB_TYPES.find((t) => t.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
}

export {
  FENCE_TYPES,
  FENCE_TYPE_LABELS,
  GATE_TYPES,
  SCREEN_SKUS,
  WEIGHT_MODES,
} from "./bom/catalog";
