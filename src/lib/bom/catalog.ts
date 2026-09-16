/** Canonical BOM names, fence types, and catalog aliases. Live rules: docs/BOM_APPROVED.md */

export const FENCE_TYPES = [
  "CL6",
  "CL8",
  "CL6+1",
  "CL8+1",
  "6x10",
  "6x12",
  "8x10",
  "8x12",
  "BARRICADE",
] as const;

export type FenceType = (typeof FENCE_TYPES)[number];

export const FENCE_TYPE_LABELS: Record<FenceType, string> = {
  CL6: "6′ chainlink",
  CL8: "8′ chainlink",
  "CL6+1": "6′ chainlink + 3-strand barb",
  "CL8+1": "8′ chainlink + 3-strand barb",
  "6x10": "6×10 panel",
  "6x12": "6×12 panel",
  "8x10": "8×10 panel",
  "8x12": "8×12 panel",
  BARRICADE: "Bike barricade",
};

export const PANEL_TYPES = ["6x10", "6x12", "8x10", "8x12"] as const;
export type PanelType = (typeof PANEL_TYPES)[number];

export const PANEL_WIDTH: Record<PanelType, number> = {
  "6x10": 10,
  "6x12": 12,
  "8x10": 10,
  "8x12": 12,
};

export const CHAINLINK_BASE = ["CL6", "CL8", "CL6+1", "CL8+1"] as const;
export type ChainlinkFenceType = (typeof CHAINLINK_BASE)[number];

export const WEIGHT_MODES = ["BFOOT", "SBAG"] as const;
export type WeightMode = (typeof WEIGHT_MODES)[number];

export const SCREEN_SKUS = [
  "BLACK6",
  "BLACK8",
  "GREEN6",
  "GREEN8",
  "ROYAL6",
  "NAVY6",
  "CUSTOM",
] as const;
export type ScreenSku = (typeof SCREEN_SKUS)[number];

/** Excel GATE / GATE2 body SKUs, plus 12x8 (dropdown gap — still emitted with a warning). */
export const GATE_TYPES = [
  "4x6",
  "5x6",
  "6x6",
  "7x6",
  "9x6",
  "12x6",
  "14x6",
  "15x6",
  "15x6 SLIDE",
  "20x6",
  "20x6 SLIDE",
  "4x8",
  "6x8",
  "10x8",
  "12x8",
  "14x8",
  "14x8 SLIDE",
  "20x8",
  "20x8 SLIDE",
] as const;
export type GateType = (typeof GATE_TYPES)[number];

export const SLIDE_GATE_TYPES = [
  "15x6 SLIDE",
  "20x6 SLIDE",
  "14x8 SLIDE",
  "20x8 SLIDE",
] as const;

export const SHORT_SLIDE_GATE_TYPES = ["15x6 SLIDE", "14x8 SLIDE"] as const;
export const LONG_SLIDE_GATE_TYPES = ["20x6 SLIDE", "20x8 SLIDE"] as const;

/** Names that have no inventory SKU in the ops workbook (still emit the line + warning). */
export const KNOWN_SKU_GAPS = new Set<string>(["12x8", "4x6", "CUSTOM"]);

export type BomSeedItem = {
  sku: string;
  name: string;
  unit: string;
  reusable: boolean;
  startingQty: number;
  unitCost: number;
  description?: string;
};

/** Demo qty/cost for gate bodies that exist in the Excel SKU columns (not KNOWN_SKU_GAPS). */
const GATE_SEED_STATS: Partial<Record<GateType, { startingQty: number; unitCost: number }>> = {
  "5x6": { startingQty: 12, unitCost: 110 },
  "6x6": { startingQty: 12, unitCost: 120 },
  "7x6": { startingQty: 8, unitCost: 130 },
  "9x6": { startingQty: 8, unitCost: 140 },
  "12x6": { startingQty: 10, unitCost: 160 },
  "14x6": { startingQty: 6, unitCost: 180 },
  "15x6": { startingQty: 4, unitCost: 190 },
  "15x6 SLIDE": { startingQty: 4, unitCost: 240 },
  "20x6": { startingQty: 3, unitCost: 220 },
  "20x6 SLIDE": { startingQty: 3, unitCost: 280 },
  "4x8": { startingQty: 10, unitCost: 125 },
  "6x8": { startingQty: 8, unitCost: 140 },
  "10x8": { startingQty: 6, unitCost: 170 },
  "14x8": { startingQty: 4, unitCost: 200 },
  "14x8 SLIDE": { startingQty: 3, unitCost: 260 },
  "20x8": { startingQty: 2, unitCost: 240 },
  "20x8 SLIDE": { startingQty: 2, unitCost: 300 },
};

/** GATE_TYPES minus documented ops gaps — every one of these must exist in the demo catalog. */
export function gateTypesExpectedInSeed(): GateType[] {
  return GATE_TYPES.filter((g) => !KNOWN_SKU_GAPS.has(g));
}

export const BOM_GATE_SEED_ITEMS: BomSeedItem[] = gateTypesExpectedInSeed().map((g) => {
  const stats = GATE_SEED_STATS[g] ?? { startingQty: 8, unitCost: 150 };
  return {
    sku: g.replace(/\s+/g, "-"),
    name: g,
    unit: "ea",
    reusable: true,
    startingQty: stats.startingQty,
    unitCost: stats.unitCost,
  };
});

export const BOM_NAMES = {
  panel: {
    "6x10": "6x10",
    "6x12": "6x12",
    "8x10": "8x10",
    "8x12": "8x12",
  },
  tStands: "T-STANDS",
  saddleClamps: "SADDLE CLAMPS",
  panelBolts: "CB5/16x2-1/2",
  bigFeet: "BIG FEET",
  sandBag: "SAND BAG",
  barricade: "BARRICADE",
  cl6Wire: "6' FENCE WIRE",
  cl8Wire: "8' FENCE WIRE",
  cl6LinePost: "8' LINE POST",
  cl8LinePost: "10' LINE POST",
  cl6Terminal: "8' x 2-1/2",
  cl8Terminal: "10' TERMINAL POST",
  ties: "ALUMINUM TIES",
  tube138: "TOP RAIL",
  loopCap: "LOOP CAP",
  cl6TensionBar: "6' TENSION BAR",
  cl8TensionBar: "8' TENSION BAR",
  braceBand: "2-1/2 BRACE BAND",
  tensionBand: "2-1/2 TENSION BAND",
  clBolts: "CB5/16x1-1/4",
  railEnd: "RAIL END",
  boulevardClamp: "BOULEVARD CLAMP 1-5/8x1-3/8",
  barbArm: "BARB ARM 45",
  barbWire: "BARB WIRE",
  zipTies: "ZIP TIES",
  swingRoller: 'SWING GATE ROLLER WHEEL 6"',
  mh: "MH2-1/2",
  cb38x3: "CB3/8x3",
  fh: "FH1-3/8",
  cb38x214: "CB3/8x2-1/4",
  slideCarrier: 'DBL WHEEL GATE CARRIER 8"',
  slideSafetyRoller: 'GATE PIPE TRACK SAFETY ROLLER WHEEL 5"',
  trackBracket: "TRACK BRACKET 2-1/2",
} as const;

/**
 * Extra catalog names that should match a canonical BOM name.
 * Comparison is case-insensitive after quote/whitespace normalize.
 */
export const BOM_NAME_ALIASES: Record<string, string[]> = {
  "SADDLE CLAMPS": ["SADDLE CLAMP"],
  "10' TERMINAL POST": ["10' TERMINAL  POST"],
  "8x12": ["8X12"],
  "TOP RAIL": ['1-3/8" TUBE', "1-3/8 TUBE", "1-3/8″ TUBE"],
  "BARB ARM 45": ["BARB_ARM_45", "45 DEGREE BARB ARM", "45° BARB ARM"],
  "BARB WIRE": ["BARB_WIRE", "BARBED WIRE"],
  "BOULEVARD CLAMP 1-5/8x1-3/8": [
    "BOULEVARD CLAMP 1-5/8 X 1-3/8",
    "BOULEVARD CLAMPS 1-5/8x1-3/8",
  ],
};

/** Demo catalog rows so Generate BOM can link inventory. Fake qtys/costs only. */
export const BOM_SEED_ITEMS: BomSeedItem[] = [
  { sku: "6x10", name: "6x10", unit: "ea", reusable: true, startingQty: 200, unitCost: 48 },
  { sku: "6x12", name: "6x12", unit: "ea", reusable: true, startingQty: 180, unitCost: 52 },
  { sku: "8x10", name: "8x10", unit: "ea", reusable: true, startingQty: 80, unitCost: 58 },
  { sku: "8x12", name: "8x12", unit: "ea", reusable: true, startingQty: 70, unitCost: 62 },
  { sku: "T-STANDS", name: "T-STANDS", unit: "ea", reusable: true, startingQty: 250, unitCost: 22 },
  {
    sku: "SADDLE-CLAMP",
    name: "SADDLE CLAMP",
    unit: "ea",
    reusable: true,
    startingQty: 400,
    unitCost: 4,
    description: "Singular inventory name; BOM emits SADDLE CLAMPS",
  },
  { sku: "CB5-16x2-1-2", name: "CB5/16x2-1/2", unit: "ea", reusable: true, startingQty: 500, unitCost: 0.4 },
  { sku: "BIG-FEET", name: "BIG FEET", unit: "ea", reusable: true, startingQty: 200, unitCost: 12 },
  { sku: "SAND-BAG", name: "SAND BAG", unit: "ea", reusable: true, startingQty: 200, unitCost: 6 },
  { sku: "BARRICADE", name: "BARRICADE", unit: "ea", reusable: true, startingQty: 120, unitCost: 35 },
  { sku: "6FT-WIRE", name: "6' FENCE WIRE", unit: "roll", reusable: true, startingQty: 40, unitCost: 85 },
  { sku: "8FT-WIRE", name: "8' FENCE WIRE", unit: "roll", reusable: true, startingQty: 30, unitCost: 95 },
  { sku: "8FT-LINE-POST", name: "8' LINE POST", unit: "ea", reusable: true, startingQty: 300, unitCost: 18 },
  { sku: "10FT-LINE-POST", name: "10' LINE POST", unit: "ea", reusable: true, startingQty: 220, unitCost: 22 },
  { sku: "8FT-2-1-2", name: "8' x 2-1/2", unit: "ea", reusable: true, startingQty: 80, unitCost: 28 },
  { sku: "10FT-TERMINAL", name: "10' TERMINAL POST", unit: "ea", reusable: true, startingQty: 60, unitCost: 32 },
  { sku: "AL-TIES", name: "ALUMINUM TIES", unit: "ea", reusable: false, startingQty: 8000, unitCost: 0.05 },
  {
    sku: "TOP-RAIL",
    name: "TOP RAIL",
    unit: "stick",
    reusable: true,
    startingQty: 150,
    unitCost: 16,
    description: "1-3/8″ tube used for top and/or bottom rail",
  },
  { sku: "LOOP-CAP", name: "LOOP CAP", unit: "ea", reusable: true, startingQty: 300, unitCost: 2.5 },
  { sku: "6FT-TENSION-BAR", name: "6' TENSION BAR", unit: "ea", reusable: true, startingQty: 80, unitCost: 8 },
  { sku: "8FT-TENSION-BAR", name: "8' TENSION BAR", unit: "ea", reusable: true, startingQty: 60, unitCost: 9 },
  { sku: "BRACE-BAND-2-1-2", name: "2-1/2 BRACE BAND", unit: "ea", reusable: true, startingQty: 200, unitCost: 1.5 },
  { sku: "TENSION-BAND-2-1-2", name: "2-1/2 TENSION BAND", unit: "ea", reusable: true, startingQty: 400, unitCost: 1.5 },
  { sku: "CB5-16x1-1-4", name: "CB5/16x1-1/4", unit: "ea", reusable: true, startingQty: 800, unitCost: 0.3 },
  { sku: "RAIL-END", name: "RAIL END", unit: "ea", reusable: true, startingQty: 150, unitCost: 3 },
  {
    sku: "BLVD-CLAMP",
    name: "BOULEVARD CLAMP 1-5/8x1-3/8",
    unit: "ea",
    reusable: true,
    startingQty: 200,
    unitCost: 4.5,
  },
  { sku: "BARB-ARM-45", name: "BARB ARM 45", unit: "ea", reusable: true, startingQty: 200, unitCost: 7 },
  { sku: "BARB-WIRE", name: "BARB WIRE", unit: "roll", reusable: true, startingQty: 20, unitCost: 55 },
  { sku: "BLACK6", name: "BLACK6", unit: "roll", reusable: true, startingQty: 40, unitCost: 40 },
  { sku: "BLACK8", name: "BLACK8", unit: "roll", reusable: true, startingQty: 30, unitCost: 48 },
  { sku: "GREEN6", name: "GREEN6", unit: "roll", reusable: true, startingQty: 25, unitCost: 40 },
  { sku: "GREEN8", name: "GREEN8", unit: "roll", reusable: true, startingQty: 20, unitCost: 48 },
  { sku: "ROYAL6", name: "ROYAL6", unit: "roll", reusable: true, startingQty: 15, unitCost: 42 },
  { sku: "NAVY6", name: "NAVY6", unit: "roll", reusable: true, startingQty: 10, unitCost: 42 },
  { sku: "ZIP-TIES", name: "ZIP TIES", unit: "ea", reusable: false, startingQty: 5000, unitCost: 0.03 },
  ...BOM_GATE_SEED_ITEMS,
  { sku: "SWING-ROLLER-6", name: 'SWING GATE ROLLER WHEEL 6"', unit: "ea", reusable: true, startingQty: 20, unitCost: 18 },
  { sku: "MH2-1-2", name: "MH2-1/2", unit: "ea", reusable: true, startingQty: 40, unitCost: 6 },
  { sku: "CB3-8x3", name: "CB3/8x3", unit: "ea", reusable: true, startingQty: 80, unitCost: 0.5 },
  { sku: "FH1-3-8", name: "FH1-3/8", unit: "ea", reusable: true, startingQty: 40, unitCost: 5 },
  { sku: "CB3-8x2-1-4", name: "CB3/8x2-1/4", unit: "ea", reusable: true, startingQty: 80, unitCost: 0.45 },
  {
    sku: "SLIDE-CARRIER-8",
    name: 'DBL WHEEL GATE CARRIER 8"',
    unit: "ea",
    reusable: true,
    startingQty: 8,
    unitCost: 95,
  },
  {
    sku: "SLIDE-SAFETY-5",
    name: 'GATE PIPE TRACK SAFETY ROLLER WHEEL 5"',
    unit: "ea",
    reusable: true,
    startingQty: 16,
    unitCost: 22,
  },
  { sku: "TRACK-BRKT-2-1-2", name: "TRACK BRACKET 2-1/2", unit: "ea", reusable: true, startingQty: 40, unitCost: 8 },
];

const FENCE_TYPE_LOOKUP = new Map(FENCE_TYPES.map((t) => [t.toUpperCase(), t]));
const SCREEN_LOOKUP = new Map(SCREEN_SKUS.map((t) => [t.toUpperCase(), t]));
const GATE_LOOKUP = new Map(GATE_TYPES.map((t) => [t.toUpperCase(), t]));
const WEIGHT_LOOKUP = new Map(WEIGHT_MODES.map((t) => [t.toUpperCase(), t]));
const SLIDE_SET = new Set<string>(SLIDE_GATE_TYPES);
const SHORT_SLIDE_SET = new Set<string>(SHORT_SLIDE_GATE_TYPES);
const LONG_SLIDE_SET = new Set<string>(LONG_SLIDE_GATE_TYPES);
const PANEL_SET = new Set<string>(PANEL_TYPES);

export function normalizeFenceType(raw: string | null | undefined): FenceType | null {
  if (!raw) return null;
  return FENCE_TYPE_LOOKUP.get(raw.trim().toUpperCase()) ?? null;
}

export function isPanelType(t: FenceType): t is PanelType {
  return PANEL_SET.has(t);
}

export function isChainlinkType(t: FenceType): t is ChainlinkFenceType {
  return t === "CL6" || t === "CL8" || t === "CL6+1" || t === "CL8+1";
}

export function isPlusOneType(t: FenceType): boolean {
  return t === "CL6+1" || t === "CL8+1";
}

export function chainlinkBase(t: ChainlinkFenceType): "CL6" | "CL8" {
  return t === "CL8" || t === "CL8+1" ? "CL8" : "CL6";
}

export function normalizeScreenSku(raw: string | null | undefined): ScreenSku | null {
  if (!raw) return null;
  return SCREEN_LOOKUP.get(raw.trim().toUpperCase()) ?? null;
}

export function normalizeGateType(raw: string | null | undefined): GateType | null {
  if (!raw) return null;
  const t = raw.trim().replace(/\s+/g, " ");
  return GATE_LOOKUP.get(t.toUpperCase()) ?? null;
}

export function normalizeWeightMode(raw: string | null | undefined): WeightMode | null {
  if (!raw) return null;
  return WEIGHT_LOOKUP.get(raw.trim().toUpperCase()) ?? null;
}

export function isSlideGate(type: string): boolean {
  return SLIDE_SET.has(type) || /\bSLIDE\b/i.test(type);
}

export function isShortSlideGate(type: string): boolean {
  return SHORT_SLIDE_SET.has(type);
}

export function isLongSlideGate(type: string): boolean {
  return LONG_SLIDE_SET.has(type);
}
