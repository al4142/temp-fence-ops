export {
  FENCE_TYPES,
  FENCE_TYPE_LABELS,
  GATE_TYPES,
  SCREEN_SKUS,
  WEIGHT_MODES,
  BOM_NAMES,
  BOM_SEED_ITEMS,
  BOM_GATE_SEED_ITEMS,
  KNOWN_SKU_GAPS,
  gateTypesExpectedInSeed,
  normalizeFenceType,
  normalizeGateType,
  normalizeScreenSku,
  normalizeWeightMode,
  isPanelType,
  isChainlinkType,
  isPlusOneType,
} from "./catalog";
export { calculateBom } from "./calculate";
export { matchCatalogItem, bomLinesToMaterials, catalogMatchWarnings, normalizeCatalogKey } from "./match-catalog";
export type { BomInput, BomLine, BomResult, BomGateInput, MatchedBomMaterial } from "./types";
