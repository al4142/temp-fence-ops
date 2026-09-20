import type { FenceType, GateType, PostMount, ScreenSku, WeightMode } from "./catalog";

export type BomGateInput = {
  type: string | null | undefined;
  qty: number;
};

/** One fence run on a job. Gates and terminals are per-section. */
export type BomSectionInput = {
  fenceType: string | null | undefined;
  qtyLf: number | null | undefined;
  topRail?: boolean | null;
  bottomRail?: boolean | null;
  weightMode?: string | null;
  /** Chainlink only. `driven` (default) or `plate`. Blank = driven. Ignored for panels/barricade. */
  postMount?: string | null;
  gate?: BomGateInput | null;
  gate2?: BomGateInput | null;
  terminalsManual?: number | null;
};

export type BomInput = Partial<BomSectionInput> & {
  /** When set and non-empty, each section is calculated and lines are merged. Else top-level fields are one section. */
  sections?: BomSectionInput[] | null;
  /** Job-level screen (rolls from total LF). */
  screenSku?: string | null;
  /** Ignored by recipes (Install/Pickup use the same qtys). Accepted so callers can pass job type. */
  jobType?: string | null;
};

export type BomSectionResult = {
  fenceType: FenceType | null;
  qtyLf: number;
  terminalsTotal: number;
  weightMode: WeightMode | null;
  postMount: PostMount | null;
};

export type BomLine = {
  skuOrName: string;
  qty: number;
  notes?: string;
};

export type BomResult = {
  lines: BomLine[];
  warnings: string[];
  notes: string[];
  fenceType: FenceType | null;
  qtyLf: number;
  terminalsTotal: number;
  weightMode: WeightMode | null;
  postMount: PostMount | null;
  screenSku: ScreenSku | null;
  gates: Array<{ type: GateType | string; qty: number; kind: "swing" | "slide" }>;
  sections: BomSectionResult[];
};

export type CatalogItem = {
  id: string;
  sku: string;
  name: string;
};

export type MatchedBomMaterial = {
  inventoryItemId: string | null;
  itemName: string | null;
  quantity: number;
  notes: string | null;
  catalogMatched: boolean;
  skuOrName: string;
};
