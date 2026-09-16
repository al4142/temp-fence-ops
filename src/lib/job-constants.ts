export const JOB_TYPES = [
  "INST",
  "PU",
  "PICKUP",
  "DELIVERY",
  "INSTALL",
  "DEL",
  "DROP",
  "RETURN",
  "RET",
  "OTHER",
] as const;

export const JOB_CLASSES = ["EVENT", "CONSTRUCTION", "OTHER"] as const;

export {
  FENCE_TYPES,
  FENCE_TYPE_LABELS,
  GATE_TYPES,
  SCREEN_SKUS,
  WEIGHT_MODES,
} from "./bom/catalog";
