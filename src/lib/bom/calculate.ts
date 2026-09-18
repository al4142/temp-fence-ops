import {
  BOM_NAMES,
  KNOWN_SKU_GAPS,
  PANEL_WIDTH,
  chainlinkBase,
  isChainlinkType,
  isKnownSkuGap,
  isLongSlideGate,
  isPanelType,
  isPlusOneType,
  isShortSlideGate,
  isSlideGate,
  normalizeFenceType,
  normalizeGateType,
  normalizeScreenSku,
  normalizeWeightMode,
  type FenceType,
  type GateType,
  type PanelType,
} from "./catalog";
import type { BomGateInput, BomInput, BomLine, BomResult } from "./types";

function ceil(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n);
}

function nonNegInt(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function addLine(
  map: Map<string, BomLine>,
  skuOrName: string,
  qty: number,
  notes?: string
) {
  if (!Number.isFinite(qty) || qty === 0) return;
  const existing = map.get(skuOrName);
  if (existing) {
    existing.qty += qty;
    if (notes) {
      existing.notes = existing.notes ? mergeNotes(existing.notes, notes) : notes;
    }
  } else {
    map.set(skuOrName, notes ? { skuOrName, qty, notes } : { skuOrName, qty });
  }
}

function mergeNotes(a: string, b: string): string {
  if (a.includes(b)) return a;
  return `${a}; ${b}`;
}

function parseGate(
  raw: BomGateInput | null | undefined,
  warnings: string[],
  label: string
): { type: string | null; canonical: GateType | null; qty: number } {
  const qty = nonNegInt(raw?.qty);
  const typeRaw = raw?.type?.trim() || "";
  if (!typeRaw && qty === 0) return { type: null, canonical: null, qty: 0 };
  if (qty > 0 && !typeRaw) {
    warnings.push(`${label}: quantity ${qty} has no gate type — body/hardware skipped; terminals still count.`);
    return { type: null, canonical: null, qty };
  }
  if (typeRaw && qty === 0) {
    return { type: typeRaw, canonical: normalizeGateType(typeRaw), qty: 0 };
  }
  const canonical = normalizeGateType(typeRaw);
  const gap = isKnownSkuGap(typeRaw);
  if (gap) {
    warnings.push(
      `${label}: ${gap} is a known catalog gap (no inventory SKU). Line is still emitted as free-text; inventory will not move.`
    );
    return { type: gap, canonical, qty };
  }
  if (!canonical) {
    warnings.push(`${label}: unrecognized gate type "${typeRaw}" — emitted as free-text; treated as swing unless name includes SLIDE.`);
    return { type: typeRaw, canonical: null, qty };
  }
  return { type: canonical, canonical, qty };
}

function addPanelRecipe(
  map: Map<string, BomLine>,
  type: PanelType,
  lf: number,
  weightMode: ReturnType<typeof normalizeWeightMode>
) {
  const n = ceil(lf / PANEL_WIDTH[type]);
  if (n < 1) return;
  addLine(map, BOM_NAMES.panel[type], n);
  const stands = n + 1;
  const clamps = n - 1;
  addLine(map, BOM_NAMES.tStands, stands);
  addLine(map, BOM_NAMES.saddleClamps, clamps);
  addLine(map, BOM_NAMES.panelBolts, clamps);
  if (weightMode === "BFOOT") addLine(map, BOM_NAMES.bigFeet, stands * 2);
  if (weightMode === "SBAG") addLine(map, BOM_NAMES.sandBag, stands * 2);
}

function addChainlinkRecipe(
  map: Map<string, BomLine>,
  type: FenceType,
  lf: number,
  topRail: boolean,
  bottomRail: boolean,
  terminalsTotal: number
) {
  if (!isChainlinkType(type)) return;
  const base = chainlinkBase(type);
  const linePosts = ceil(lf / 10);
  const wireRolls = ceil(lf / 50);
  const tiesPer = base === "CL6" ? 8 : 10;
  let ties = (lf / 10) * tiesPer;
  if (topRail) ties += (lf / 10) * 5;

  addLine(map, base === "CL6" ? BOM_NAMES.cl6Wire : BOM_NAMES.cl8Wire, wireRolls);
  addLine(map, base === "CL6" ? BOM_NAMES.cl6LinePost : BOM_NAMES.cl8LinePost, linePosts);
  addLine(map, BOM_NAMES.ties, ties);

  const railSticks = topRail || bottomRail ? ceil(lf / 21) : 0;
  if (topRail) {
    addLine(map, BOM_NAMES.tube138, railSticks, '1-3/8″ tube (top rail)');
    addLine(map, BOM_NAMES.loopCap, linePosts);
  }
  if (bottomRail) {
    addLine(map, BOM_NAMES.tube138, railSticks, '1-3/8″ tube (bottom rail)');
    addLine(map, BOM_NAMES.boulevardClamp, linePosts);
  }

  const railEnds = terminalsTotal * (topRail ? 1 : 0) + terminalsTotal * (bottomRail ? 1 : 0);

  if (terminalsTotal > 0) {
    addLine(map, base === "CL6" ? BOM_NAMES.cl6Terminal : BOM_NAMES.cl8Terminal, terminalsTotal);
    addLine(
      map,
      base === "CL6" ? BOM_NAMES.cl6TensionBar : BOM_NAMES.cl8TensionBar,
      terminalsTotal
    );
    addLine(map, BOM_NAMES.braceBand, terminalsTotal);
    const fabricBands = terminalsTotal * (base === "CL6" ? 3 : 4);
    addLine(map, BOM_NAMES.tensionBand, fabricBands, "fabric / rail-end (temp multiplier)");
    if (isPlusOneType(type)) {
      addLine(map, BOM_NAMES.tensionBand, terminalsTotal * 3, "barb: 1 band per strand at each terminal");
    }
    addLine(map, BOM_NAMES.railEnd, railEnds);
    const tensionBandQty =
      fabricBands + (isPlusOneType(type) ? terminalsTotal * 3 : 0);
    addLine(map, BOM_NAMES.clBolts, terminalsTotal + tensionBandQty + railEnds);
  }

  if (isPlusOneType(type) && lf > 0) {
    addLine(map, BOM_NAMES.barbArm, linePosts, "one 45° arm per line post");
    const barbRolls = ceil((lf * 3) / 1320);
    addLine(map, BOM_NAMES.barbWire, barbRolls, "3 strands; 1,320′ rolls");
  }
}

function addScreenRecipe(
  map: Map<string, BomLine>,
  lf: number,
  screenSku: ReturnType<typeof normalizeScreenSku>,
  rawSku: string | null | undefined,
  warnings: string[]
) {
  const raw = rawSku?.trim() ?? "";
  if (!raw) return;
  if (!screenSku) {
    warnings.push(
      `Screen "${raw}" is not a SKU (BLACK6, BLACK8, GREEN6, GREEN8, ROYAL6, NAVY6, CUSTOM). Screen BOM skipped.`
    );
    return;
  }
  if (lf <= 0) {
    warnings.push("Screen SKU is set but LF is 0 — no screen rolls.");
    return;
  }
  const rolls = ceil(lf / 50);
  addLine(map, screenSku, rolls);
  addLine(map, BOM_NAMES.zipTies, rolls * 110);
  if (KNOWN_SKU_GAPS.has(screenSku)) {
    warnings.push(`${screenSku} has no matching inventory SKU in the ops catalog — emitted as free-text.`);
  }
}

function addGateRecipes(
  map: Map<string, BomLine>,
  gates: Array<{ type: string; qty: number }>,
  resultGates: BomResult["gates"]
) {
  let swingCount = 0;
  let slideCount = 0;
  let hasShortSlide = false;
  let hasLongSlide = false;

  for (const g of gates) {
    if (g.qty <= 0) continue;
    addLine(map, g.type, g.qty);
    if (isSlideGate(g.type)) {
      slideCount += g.qty;
      if (isShortSlideGate(g.type)) hasShortSlide = true;
      else if (isLongSlideGate(g.type)) hasLongSlide = true;
      else hasShortSlide = true; // unknown SLIDE → Excel *6 branch (safer / shorter)
      resultGates.push({ type: g.type, qty: g.qty, kind: "slide" });
    } else {
      swingCount += g.qty;
      resultGates.push({ type: g.type, qty: g.qty, kind: "swing" });
    }
  }

  if (swingCount > 0) {
    addLine(map, BOM_NAMES.swingRoller, swingCount);
    addLine(map, BOM_NAMES.mh, swingCount * 2);
    addLine(map, BOM_NAMES.cb38x3, swingCount * 2);
    addLine(map, BOM_NAMES.fh, swingCount * 2);
    addLine(map, BOM_NAMES.cb38x214, swingCount * 2);
  }

  if (slideCount > 0) {
    addLine(map, BOM_NAMES.slideCarrier, slideCount);
    addLine(map, BOM_NAMES.slideSafetyRoller, slideCount * 2);
    let bracketMult = 0;
    if (hasShortSlide) bracketMult = 6;
    else if (hasLongSlide) bracketMult = 8;
    addLine(map, BOM_NAMES.trackBracket, slideCount * bracketMult);
  }
}

/**
 * Pure temporary-fence BOM calculator (APPROVED rules).
 * Job type (Install vs Pickup) does not change quantities.
 */
export function calculateBom(input: BomInput): BomResult {
  const warnings: string[] = [];
  const notes: string[] = [];
  const lines = new Map<string, BomLine>();
  const resultGates: BomResult["gates"] = [];

  const rawType = input.fenceType?.trim() ?? "";
  const fenceType = normalizeFenceType(rawType);
  const lf = input.qtyLf != null && Number.isFinite(input.qtyLf) ? Number(input.qtyLf) : 0;
  const qtyLf = lf > 0 ? lf : 0;

  if (rawType && !fenceType) {
    warnings.push(
      `Unrecognized fence type "${rawType}". Canonical codes only (CL6, CL8, CL6+1, CL8+1, 6x10, 6x12, 8x10, 8x12, BARRICADE). Fence recipe skipped.`
    );
  }

  const plusOne = fenceType ? isPlusOneType(fenceType) : false;
  const topRail = input.topRail ?? plusOne;
  const bottomRail = Boolean(input.bottomRail);
  const weightMode = normalizeWeightMode(input.weightMode);
  if (input.weightMode?.trim() && !weightMode) {
    warnings.push(`Unrecognized weight mode "${input.weightMode}". Use BFOOT or SBAG.`);
  }

  if (plusOne && input.topRail == null) {
    notes.push("Top rail defaulted on for +1 (overridable).");
  }
  if (input.topRail === false && plusOne) {
    notes.push("Top rail overridden off on a +1 job.");
  }

  const g1 = parseGate(input.gate, warnings, "Gate");
  const g2 = parseGate(input.gate2, warnings, "Gate 2");
  const gateQtyTotal = g1.qty + g2.qty;
  const terminalsManual = nonNegInt(input.terminalsManual);
  const terminalsTotal = gateQtyTotal * 2 + terminalsManual;

  const screenSku = normalizeScreenSku(input.screenSku);

  if (fenceType && isPanelType(fenceType)) {
    if (qtyLf > 0) addPanelRecipe(lines, fenceType, qtyLf, weightMode);
    else warnings.push("Panel recipe needs LF > 0.");
    if (topRail || bottomRail) {
      notes.push("Top/bottom rail options apply to chainlink only — ignored for panels.");
    }
  } else if (fenceType === "BARRICADE") {
    if (qtyLf > 0) addLine(lines, BOM_NAMES.barricade, ceil(qtyLf / 7));
    else warnings.push("Barricade recipe needs LF > 0.");
  } else if (fenceType && isChainlinkType(fenceType)) {
    if (qtyLf > 0) {
      addChainlinkRecipe(lines, fenceType, qtyLf, topRail, bottomRail, terminalsTotal);
    } else {
      warnings.push("Chainlink recipe needs LF > 0.");
    }
    notes.push("Tension wire is out of scope for v1 and is not included.");
  }

  addScreenRecipe(lines, qtyLf, screenSku, input.screenSku, warnings);

  const typedGates: Array<{ type: string; qty: number }> = [];
  if (g1.qty > 0 && g1.type) typedGates.push({ type: g1.type, qty: g1.qty });
  if (g2.qty > 0 && g2.type) typedGates.push({ type: g2.type, qty: g2.qty });
  addGateRecipes(lines, typedGates, resultGates);

  if (weightMode && fenceType && !isPanelType(fenceType)) {
    notes.push("BFOOT/SBAG weights apply to panel T-stands only.");
  }

  notes.push("BOM quantities are the same for Install and Pickup. Inventory sign is applied separately by job type.");

  return {
    lines: [...lines.values()].filter((l) => l.qty !== 0),
    warnings,
    notes,
    fenceType,
    qtyLf,
    terminalsTotal,
    weightMode,
    screenSku,
    gates: resultGates,
  };
}
