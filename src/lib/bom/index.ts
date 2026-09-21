export {
  FENCE_TYPES,
  FENCE_TYPE_LABELS,
  GATE_TYPES,
  SLIDE_GATE_TYPES,
  SLIDE_6_GATE_TYPES,
  TUBE_138_STICK_FT,
  SCREEN_SKUS,
  WEIGHT_MODES,
  POST_MOUNTS,
  POST_MOUNT_LABELS,
  BOM_NAMES,
  BOM_SEED_ITEMS,
  BOM_GATE_SEED_ITEMS,
  KNOWN_SKU_GAPS,
  gateTypesExpectedInSeed,
  isKnownSkuGap,
  normalizeFenceType,
  normalizeGateType,
  normalizeScreenSku,
  normalizeWeightMode,
  normalizePostMount,
  isPanelType,
  isChainlinkType,
  isPlusOneType,
  isSlideGate,
  isSlide6Gate,
  parseSlideGateSize,
  slide6ExtraTrackPosts,
  slide6TrackBrackets,
} from "./catalog";
export { calculateBom } from "./calculate";
export {
  emptyJobFenceSectionForm,
  resolveFormSections,
  formSectionsToBom,
  sectionsForJob,
  summarizeSections,
  formatSectionLabel,
  resolveBomSections,
} from "./sections";
export { matchCatalogItem, bomLinesToMaterials, catalogMatchWarnings, normalizeCatalogKey } from "./match-catalog";
export type { BomInput, BomLine, BomResult, BomGateInput, BomSectionInput, BomSectionResult, MatchedBomMaterial } from "./types";
export type { JobFenceSectionForm, StoredFenceSection } from "./sections";
