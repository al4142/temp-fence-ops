export const JOB_TYPES = ["Install", "Pickup", "Drop", "Other", "Site Walk"] as const;

export type JobType = (typeof JOB_TYPES)[number];

/** Classes for Install / Pickup / Drop / Other. Do not rename or remove. */
export const JOB_CLASSES = ["EVENT", "CONSTRUCTION", "OTHER"] as const;

/** Classes for Site Walk only. Additive — not shown on existing job types. */
export const SITE_WALK_CLASSES = ["Non Pay", "Site Visit"] as const;

export type JobClass = (typeof JOB_CLASSES)[number] | (typeof SITE_WALK_CLASSES)[number];

export function isSiteWalk(jobType: string): boolean {
  return normalizeJobType(jobType) === "Site Walk";
}

/**
 * Class dropdown options for a job type.
 * Existing types keep EVENT / CONSTRUCTION / OTHER; Site Walk uses Non Pay / Site Visit.
 */
export function classesForJobType(jobType: string): readonly string[] {
  return isSiteWalk(jobType) ? SITE_WALK_CLASSES : JOB_CLASSES;
}

/** Site Walk may store a 0/0 hour labor row so a supervisor is attributed without P&L $. */
export function allowsZeroHourLabor(jobType: string): boolean {
  return isSiteWalk(jobType);
}

/**
 * Site Walk may omit fence type, LF, and materials. Other types keep today's required-line rules
 * (unnamed material rows with a non-zero qty still error).
 */
export function allowsEmptyFenceAndMaterials(jobType: string): boolean {
  return isSiteWalk(jobType);
}

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
  "SITE-WALK": "Site Walk",
  SITEWALK: "Site Walk",
};

export type ImportJobTypeMapResult =
  | { ok: true; original: string; mapped: JobType }
  | { ok: false; original: string; mapped: null; reason: string };

/** Collapse `PICK UP` / `pick_up` / `Pick-Up` to the alias-table key `PICK-UP`. */
export function importJobTypeAliasKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s_]+/g, "-");
}

const JOB_TYPE_LIST = "Install, Pickup, Drop, Other, or Site Walk";

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
    reason: `Unknown job type "${original}". Use ${JOB_TYPE_LIST} (or a known alias such as INST, PU, DELIVERY, SITEWALK). Unknown codes are not coerced to Other.`,
  };
}

export function isJobType(value: string): value is JobType {
  return (JOB_TYPES as readonly string[]).includes(value);
}

/**
 * Canonical Title Case label when the input matches a known type
 * (case-insensitive). Unknown values are returned trimmed.
 * Does not apply import aliases — the job form rejects INST / PU / DELIVERY.
 */
export function normalizeJobType(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return JOB_TYPES.find((t) => t.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
}

export function jobTypeMustBeMessage(): string {
  return `Job type must be ${JOB_TYPE_LIST}.`;
}

export {
  FENCE_TYPES,
  FENCE_TYPE_LABELS,
  GATE_TYPES,
  SCREEN_SKUS,
  WEIGHT_MODES,
} from "./bom/catalog";
