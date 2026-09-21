import {
  BOM_NAMES,
  KNOWN_SKU_GAPS,
  PANEL_WIDTH,
  TUBE_138_STICK_FT,
  chainlinkBase,
  isChainlinkType,
  isKnownSkuGap,
  isLongSlideGate,
  isPanelType,
  isPlusOneType,
  isShortSlideGate,
  isSlide6Gate,
  isSlideGate,
  normalizeFenceType,
  normalizeGateType,
  normalizePostMount,
  normalizeScreenSku,
  normalizeWeightMode,
  slide6ExtraTrackPosts,
  slide6GateFramePipeLf,
  slide6TrackBrackets,
  type ChainlinkFenceType,
  type FenceType,
  type GateType,
  type PanelType,
  type PostMount,
} from "./catalog";
import { resolveBomSections, resultFenceType, resultPostMount } from "./sections";
import type { BomGateInput, BomInput, BomLine, BomResult, BomSectionInput, BomSectionResult } from "./types";

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

/**
 * 2-1/2″ terminal posts + tension-bar / brace-band / tension-band stack.
 * Used by the chainlink fence body and also by 6′ slides when that body does not run
 * (LF=0, panel, barricade). Plate screw-bolts here are the 4-per-terminal share only.
 */
function addTerminalStack(
  map: Map<string, BomLine>,
  type: ChainlinkFenceType,
  terminalsTotal: number,
  postMount: PostMount,
  topRail: boolean,
  bottomRail: boolean
) {
  if (terminalsTotal <= 0) return;
  const base = chainlinkBase(type);
  const plate = postMount === "plate";
  const terminalName = plate
    ? base === "CL6"
      ? BOM_NAMES.cl6TerminalPlate
      : BOM_NAMES.cl8TerminalPlate
    : base === "CL6"
      ? BOM_NAMES.cl6Terminal
      : BOM_NAMES.cl8Terminal;

  addLine(map, terminalName, terminalsTotal);
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
  const railEnds = terminalsTotal * (topRail ? 1 : 0) + terminalsTotal * (bottomRail ? 1 : 0);
  addLine(map, BOM_NAMES.railEnd, railEnds);
  const tensionBandQty = fabricBands + (isPlusOneType(type) ? terminalsTotal * 3 : 0);
  addLine(map, BOM_NAMES.clBolts, terminalsTotal + tensionBandQty + railEnds);
  if (plate) {
    addLine(
      map,
      BOM_NAMES.screwBolt38x3,
      terminalsTotal * 4,
      "DeWalt SCREW-BOLT+; 2 per line plate, 4 per terminal plate"
    );
  }
}

function addChainlinkRecipe(
  map: Map<string, BomLine>,
  type: FenceType,
  lf: number,
  topRail: boolean,
  bottomRail: boolean,
  terminalsTotal: number,
  postMount: PostMount
) {
  if (!isChainlinkType(type)) return;
  const base = chainlinkBase(type);
  const linePosts = ceil(lf / 10);
  const wireRolls = ceil(lf / 50);
  const tiesPer = base === "CL6" ? 8 : 10;
  let ties = (lf / 10) * tiesPer;
  if (topRail) ties += (lf / 10) * 5;
  const plate = postMount === "plate";
  const linePostName = plate
    ? base === "CL6"
      ? BOM_NAMES.cl6LinePostPlate
      : BOM_NAMES.cl8LinePostPlate
    : base === "CL6"
      ? BOM_NAMES.cl6LinePost
      : BOM_NAMES.cl8LinePost;

  addLine(map, base === "CL6" ? BOM_NAMES.cl6Wire : BOM_NAMES.cl8Wire, wireRolls);
  addLine(map, linePostName, linePosts);
  addLine(map, BOM_NAMES.ties, ties);
  if (plate) {
    addLine(
      map,
      BOM_NAMES.screwBolt38x3,
      linePosts * 2,
      "DeWalt SCREW-BOLT+; 2 per line plate, 4 per terminal plate"
    );
  }

  const railSticks = topRail || bottomRail ? ceil(lf / TUBE_138_STICK_FT) : 0;
  if (topRail) {
    addLine(map, BOM_NAMES.tube138, railSticks, '1-3/8″ tube (top rail)');
    addLine(map, BOM_NAMES.loopCap, linePosts);
  }
  if (bottomRail) {
    addLine(map, BOM_NAMES.tube138, railSticks, '1-3/8″ tube (bottom rail)');
    addLine(map, BOM_NAMES.boulevardClamp, linePosts);
  }

  addTerminalStack(map, type, terminalsTotal, postMount, topRail, bottomRail);

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
  // 8′ (and unknown) slides keep Excel-thin hardware until Alex takeoff.
  let excelSlideCount = 0;
  let hasShortExcelSlide = false;
  let hasLongExcelSlide = false;
  let gateFramePipeLf = 0;

  for (const g of gates) {
    if (g.qty <= 0) continue;
    addLine(map, g.type, g.qty);
    if (isSlideGate(g.type)) {
      resultGates.push({ type: g.type, qty: g.qty, kind: "slide" });
      if (isSlide6Gate(g.type)) {
        addLine(map, BOM_NAMES.slideCarrier, g.qty);
        addLine(map, BOM_NAMES.slideSafetyRoller, g.qty * 2);
        addLine(map, BOM_NAMES.trackBracket, g.qty * slide6TrackBrackets(g.type));
        // Horizontal gate-frame 1-3/8″ pipe from ALE-30 table (top + bottom). Not fence-side track.
        gateFramePipeLf += slide6GateFramePipeLf(g.type) * g.qty;
      } else {
        // TODO(Alex): 8′ slide rich recipe — takeoff pending
        excelSlideCount += g.qty;
        if (isShortSlideGate(g.type)) hasShortExcelSlide = true;
        else if (isLongSlideGate(g.type)) hasLongExcelSlide = true;
        else hasShortExcelSlide = true; // unknown SLIDE → Excel *6 branch (safer / shorter)
      }
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

  if (excelSlideCount > 0) {
    addLine(map, BOM_NAMES.slideCarrier, excelSlideCount);
    addLine(map, BOM_NAMES.slideSafetyRoller, excelSlideCount * 2);
    let bracketMult = 0;
    if (hasShortExcelSlide) bracketMult = 6;
    else if (hasLongExcelSlide) bracketMult = 8;
    addLine(map, BOM_NAMES.trackBracket, excelSlideCount * bracketMult);
  }

  if (gateFramePipeLf > 0) {
    addLine(
      map,
      BOM_NAMES.tube138,
      ceil(gateFramePipeLf / TUBE_138_STICK_FT),
      `1-3/8″ tube (slide gate frame: top + bottom, each = opening; ${gateFramePipeLf}′ LF)`
    );
  }
}

function applySectionFence(
  section: BomSectionInput,
  map: Map<string, BomLine>,
  warnings: string[],
  notes: string[],
  labelPrefix: string
): BomSectionResult & { typedGates: Array<{ type: string; qty: number }> } {
  const rawType = section.fenceType?.trim() ?? "";
  const fenceType = normalizeFenceType(rawType);
  const lf = section.qtyLf != null && Number.isFinite(section.qtyLf) ? Number(section.qtyLf) : 0;
  const qtyLf = lf > 0 ? lf : 0;

  if (rawType && !fenceType) {
    warnings.push(
      `${labelPrefix}Unrecognized fence type "${rawType}". Canonical codes only (CL6, CL8, CL6+1, CL8+1, 6x10, 6x12, 8x10, 8x12, BARRICADE). Fence recipe skipped.`
    );
  }

  const plusOne = fenceType ? isPlusOneType(fenceType) : false;
  const topRail = section.topRail ?? plusOne;
  const bottomRail = Boolean(section.bottomRail);
  const weightMode = normalizeWeightMode(section.weightMode);
  if (section.weightMode?.trim() && !weightMode) {
    warnings.push(`${labelPrefix}Unrecognized weight mode "${section.weightMode}". Use BFOOT or SBAG.`);
  }
  const postMount = normalizePostMount(section.postMount);
  if (section.postMount?.trim() && !postMount) {
    warnings.push(`${labelPrefix}Unrecognized post mount "${section.postMount}". Use driven or plate.`);
  }
  const resolvedMount: PostMount = postMount ?? "driven";

  if (plusOne && section.topRail == null) {
    notes.push(`${labelPrefix}Top rail defaulted on for +1 (overridable).`);
  }
  if (section.topRail === false && plusOne) {
    notes.push(`${labelPrefix}Top rail overridden off on a +1 job.`);
  }

  const g1 = parseGate(section.gate, warnings, `${labelPrefix}Gate`.trim() || "Gate");
  const g2 = parseGate(section.gate2, warnings, `${labelPrefix}Gate 2`.trim() || "Gate 2");
  const gateQtyTotal = g1.qty + g2.qty;
  const terminalsManual = nonNegInt(section.terminalsManual);
  const extraTrackPosts =
    (g1.type && g1.qty > 0 ? slide6ExtraTrackPosts(g1.type) * g1.qty : 0) +
    (g2.type && g2.qty > 0 ? slide6ExtraTrackPosts(g2.type) * g2.qty : 0);
  // Gate rule ×2 still applies to slides; 6′ slides also add track-support terminals (ALE-30).
  const terminalsTotal = gateQtyTotal * 2 + terminalsManual + extraTrackPosts;

  if (fenceType && isPanelType(fenceType)) {
    if (qtyLf > 0) addPanelRecipe(map, fenceType, qtyLf, weightMode);
    else warnings.push(`${labelPrefix}Panel recipe needs LF > 0.`);
    if (topRail || bottomRail) {
      notes.push(`${labelPrefix}Top/bottom rail options apply to chainlink only — ignored for panels.`);
    }
    if (resolvedMount === "plate") {
      notes.push(`${labelPrefix}Post mount Plate applies to chainlink only — ignored for panels.`);
    }
  } else if (fenceType === "BARRICADE") {
    if (qtyLf > 0) addLine(map, BOM_NAMES.barricade, ceil(qtyLf / 7));
    else warnings.push(`${labelPrefix}Barricade recipe needs LF > 0.`);
    if (resolvedMount === "plate") {
      notes.push(`${labelPrefix}Post mount Plate applies to chainlink only — ignored for barricade.`);
    }
  } else if (fenceType && isChainlinkType(fenceType)) {
    if (qtyLf > 0) {
      addChainlinkRecipe(map, fenceType, qtyLf, topRail, bottomRail, terminalsTotal, resolvedMount);
    } else {
      warnings.push(`${labelPrefix}Chainlink recipe needs LF > 0.`);
      // 6′ slide track supports still need the terminal SKU stack with no fence body.
      if (extraTrackPosts > 0) {
        addTerminalStack(map, fenceType, terminalsTotal, resolvedMount, topRail, bottomRail);
      }
    }
  }

  // Panel / barricade / unknown: chainlink recipe never runs. 6′ slides still emit
  // the usual CL6 driven terminal stack (gate ×2 + track extras).
  if (extraTrackPosts > 0 && !(fenceType && isChainlinkType(fenceType))) {
    addTerminalStack(map, "CL6", terminalsTotal, "driven", false, false);
  }

  if (weightMode && fenceType && !isPanelType(fenceType)) {
    notes.push(`${labelPrefix}BFOOT/SBAG weights apply to panel T-stands only.`);
  }

  const typedGates: Array<{ type: string; qty: number }> = [];
  if (g1.qty > 0 && g1.type) typedGates.push({ type: g1.type, qty: g1.qty });
  if (g2.qty > 0 && g2.type) typedGates.push({ type: g2.type, qty: g2.qty });

  return {
    fenceType,
    qtyLf,
    terminalsTotal,
    weightMode,
    postMount: fenceType && isChainlinkType(fenceType) ? resolvedMount : fenceType ? null : resolvedMount,
    typedGates,
  };
}

/**
 * Pure temporary-fence BOM calculator (APPROVED rules).
 * Job type (Install vs Pickup) does not change quantities.
 * `sections[]` runs each fence run and merges lines; omitted sections = one run from top-level fields.
 */
export function calculateBom(input: BomInput): BomResult {
  const warnings: string[] = [];
  const notes: string[] = [];
  const lines = new Map<string, BomLine>();
  const resultGates: BomResult["gates"] = [];
  const sectionResults: BomSectionResult[] = [];

  const rawSections = resolveBomSections(input);
  const multi = rawSections.length > 1;
  const typedGates: Array<{ type: string; qty: number }> = [];
  let anyChainlink = false;
  let anyPlate = false;

  rawSections.forEach((section, idx) => {
    const prefix = multi ? `Section ${idx + 1}: ` : "";
    const applied = applySectionFence(section, lines, warnings, notes, prefix);
    sectionResults.push({
      fenceType: applied.fenceType,
      qtyLf: applied.qtyLf,
      terminalsTotal: applied.terminalsTotal,
      weightMode: applied.weightMode,
      postMount: applied.postMount,
    });
    typedGates.push(...applied.typedGates);
    if (applied.fenceType && isChainlinkType(applied.fenceType)) {
      anyChainlink = true;
      if (applied.postMount === "plate") anyPlate = true;
    }
  });

  if (anyChainlink) {
    notes.push("Tension wire is out of scope for v1 and is not included.");
  }
  if (anyPlate) {
    notes.push("Plate (concrete) mount: fence-height posts on floor plates; SCREW-BOLT+ 3/8x3 is consumable.");
  }
  if (multi) {
    notes.push(`Merged ${rawSections.length} fence sections into one BOM.`);
  }

  const qtyLf = sectionResults.reduce((s, r) => s + r.qtyLf, 0);
  const terminalsTotal = sectionResults.reduce((s, r) => s + r.terminalsTotal, 0);
  const screenSku = normalizeScreenSku(input.screenSku);
  addScreenRecipe(lines, qtyLf, screenSku, input.screenSku, warnings);
  addGateRecipes(lines, typedGates, resultGates);

  notes.push("BOM quantities are the same for Install and Pickup. Inventory sign is applied separately by job type.");

  return {
    lines: [...lines.values()].filter((l) => l.qty !== 0),
    warnings,
    notes,
    fenceType: resultFenceType(sectionResults.map((s) => s.fenceType)),
    qtyLf,
    terminalsTotal,
    weightMode: sectionResults.find((s) => s.weightMode)?.weightMode ?? null,
    postMount: resultPostMount(sectionResults.map((s) => s.postMount)),
    screenSku,
    gates: resultGates,
    sections: sectionResults,
  };
}
