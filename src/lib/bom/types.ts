import type { FenceType, GateType, ScreenSku, WeightMode } from "./catalog";

export type BomGateInput = {
  type: string | null | undefined;
  qty: number;
};

export type BomInput = {
  fenceType: string | null | undefined;
  qtyLf: number | null | undefined;
  topRail?: boolean | null;
  bottomRail?: boolean | null;
  weightMode?: string | null;
  screenSku?: string | null;
  gate?: BomGateInput | null;
  gate2?: BomGateInput | null;
  terminalsManual?: number | null;
  /** Ignored by recipes (Install/Pickup use the same qtys). Accepted so callers can pass job type. */
  jobType?: string | null;
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
  screenSku: ScreenSku | null;
  gates: Array<{ type: GateType | string; qty: number; kind: "swing" | "slide" }>;
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
