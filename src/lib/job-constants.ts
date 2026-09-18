export const JOB_TYPES = ["Install", "Pickup", "Drop", "Other"] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_CLASSES = ["EVENT", "CONSTRUCTION", "OTHER"] as const;

/**
 * Legacy codes that may still be stored on older tickets or CSV imports.
 * Mapped to the four Title Case labels when reading / writing.
 */
const LEGACY_JOB_TYPE_MAP: Record<string, JobType> = {
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

export function isJobType(value: string): value is JobType {
  return (JOB_TYPES as readonly string[]).includes(value);
}

/**
 * Canonical Title Case label when the input is a known type or legacy code.
 * Unknown values are returned trimmed (inventory treats them as no movement).
 */
export function normalizeJobType(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const titled = JOB_TYPES.find((t) => t.toLowerCase() === trimmed.toLowerCase());
  if (titled) return titled;
  return LEGACY_JOB_TYPE_MAP[trimmed.toUpperCase()] ?? trimmed;
}

/** Coerce to one of the four labels; unknown / blank → Other. */
export function canonicalJobType(raw: string): JobType {
  const normalized = normalizeJobType(raw);
  return isJobType(normalized) ? normalized : "Other";
}

/** DB match values for a filter so legacy tickets still appear. */
export function jobTypeQueryValues(raw: string): string[] {
  const canonical = canonicalJobType(raw);
  const aliases = Object.entries(LEGACY_JOB_TYPE_MAP)
    .filter(([, mapped]) => mapped === canonical)
    .map(([code]) => code);
  return Array.from(new Set([canonical, ...aliases]));
}

export {
  FENCE_TYPES,
  FENCE_TYPE_LABELS,
  GATE_TYPES,
  SCREEN_SKUS,
  WEIGHT_MODES,
} from "./bom/catalog";
