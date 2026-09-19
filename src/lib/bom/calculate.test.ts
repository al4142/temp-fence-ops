import { describe, expect, it } from "vitest";
import { calculateBom } from "./calculate";
import {
  BOM_NAMES,
  BOM_SEED_ITEMS,
  GATE_TYPES,
  KNOWN_SKU_GAPS,
  gateTypesExpectedInSeed,
} from "./catalog";
import { bomLinesToMaterials, matchCatalogItem } from "./match-catalog";
import type { BomResult } from "./types";

function qty(result: BomResult, name: string): number {
  return result.lines.find((l) => l.skuOrName === name)?.qty ?? 0;
}

function names(result: BomResult): string[] {
  return result.lines.map((l) => l.skuOrName);
}

describe("panels", () => {
  it("6x10: n=CEIL(LF/10); stands=n+1; clamps=n-1; bolts=clamps", () => {
    const r = calculateBom({ fenceType: "6x10", qtyLf: 400 });
    expect(qty(r, "6x10")).toBe(40);
    expect(qty(r, BOM_NAMES.tStands)).toBe(41);
    expect(qty(r, BOM_NAMES.saddleClamps)).toBe(39);
    expect(qty(r, BOM_NAMES.panelBolts)).toBe(39);
    expect(qty(r, BOM_NAMES.bigFeet)).toBe(0);
    expect(qty(r, BOM_NAMES.sandBag)).toBe(0);
  });

  it("6x12 LF=340", () => {
    const r = calculateBom({ fenceType: "6x12", qtyLf: 340 });
    expect(qty(r, "6x12")).toBe(29);
    expect(qty(r, BOM_NAMES.tStands)).toBe(30);
    expect(qty(r, BOM_NAMES.saddleClamps)).toBe(28);
  });

  it("8x10 and 8x12 use width 10 / 12", () => {
    const a = calculateBom({ fenceType: "8x10", qtyLf: 25 });
    expect(qty(a, "8x10")).toBe(3);
    expect(qty(a, BOM_NAMES.tStands)).toBe(4);
    expect(qty(a, BOM_NAMES.saddleClamps)).toBe(2);
    const b = calculateBom({ fenceType: "8x12", qtyLf: 24 });
    expect(qty(b, "8x12")).toBe(2);
    expect(qty(b, BOM_NAMES.tStands)).toBe(3);
    expect(qty(b, BOM_NAMES.saddleClamps)).toBe(1);
  });

  it("1 panel still gets n+1 stands and 0 clamps (APPROVED, not Excel >1 quirk)", () => {
    const r = calculateBom({ fenceType: "6x10", qtyLf: 10 });
    expect(qty(r, "6x10")).toBe(1);
    expect(qty(r, BOM_NAMES.tStands)).toBe(2);
    expect(qty(r, BOM_NAMES.saddleClamps)).toBe(0);
    expect(qty(r, BOM_NAMES.panelBolts)).toBe(0);
  });

  it("BFOOT / SBAG = 2 × stands", () => {
    const feet = calculateBom({ fenceType: "6x12", qtyLf: 108, weightMode: "BFOOT" });
    expect(qty(feet, "6x12")).toBe(9);
    expect(qty(feet, BOM_NAMES.tStands)).toBe(10);
    expect(qty(feet, BOM_NAMES.bigFeet)).toBe(20);
    expect(qty(feet, BOM_NAMES.sandBag)).toBe(0);
    const bags = calculateBom({ fenceType: "6x12", qtyLf: 108, weightMode: "SBAG" });
    expect(qty(bags, BOM_NAMES.sandBag)).toBe(20);
    expect(qty(bags, BOM_NAMES.bigFeet)).toBe(0);
  });

  it("blank weight mode emits no weights", () => {
    const r = calculateBom({ fenceType: "6x10", qtyLf: 100 });
    expect(qty(r, BOM_NAMES.bigFeet)).toBe(0);
    expect(qty(r, BOM_NAMES.sandBag)).toBe(0);
  });
});

describe("barricade", () => {
  it("CEIL(LF/7)", () => {
    const r = calculateBom({ fenceType: "BARRICADE", qtyLf: 275 });
    expect(qty(r, BOM_NAMES.barricade)).toBe(40);
    expect(qty(r, BOM_NAMES.tStands)).toBe(0);
  });
});

describe("chainlink core", () => {
  it("CL6 LF=600 no rail no terminals", () => {
    const r = calculateBom({ fenceType: "CL6", qtyLf: 600, topRail: false });
    expect(qty(r, BOM_NAMES.cl6Wire)).toBe(12);
    expect(qty(r, BOM_NAMES.cl6LinePost)).toBe(60);
    expect(qty(r, BOM_NAMES.ties)).toBe(480);
    expect(qty(r, BOM_NAMES.cl6TensionBar)).toBe(0);
    expect(qty(r, BOM_NAMES.tensionBand)).toBe(0);
    expect(qty(r, BOM_NAMES.tube138)).toBe(0);
    expect(r.notes.some((n) => /tension wire/i.test(n))).toBe(true);
    expect(names(r).some((n) => /tension wire/i.test(n))).toBe(false);
  });

  it("CL6 LF=233 top rail, no terminals (Excel sample, APPROVED ties)", () => {
    const r = calculateBom({
      fenceType: "CL6",
      qtyLf: 233,
      topRail: true,
      terminalsManual: 0,
    });
    expect(qty(r, BOM_NAMES.cl6Wire)).toBe(5);
    expect(qty(r, BOM_NAMES.cl6LinePost)).toBe(24);
    expect(qty(r, BOM_NAMES.ties)).toBeCloseTo((233 / 10) * 8 + (233 / 10) * 5, 10);
    expect(qty(r, BOM_NAMES.tube138)).toBe(12);
    expect(qty(r, BOM_NAMES.loopCap)).toBe(24);
    expect(qty(r, BOM_NAMES.railEnd)).toBe(0);
  });

  it("CL8 LF=216", () => {
    const r = calculateBom({ fenceType: "CL8", qtyLf: 216, topRail: false });
    expect(qty(r, BOM_NAMES.cl8Wire)).toBe(5);
    expect(qty(r, BOM_NAMES.cl8LinePost)).toBe(22);
    expect(qty(r, BOM_NAMES.ties)).toBe(216);
  });

  it("CL8 options: top rail, terminals from gates*2 + manual, temp band *4", () => {
    const r = calculateBom({
      fenceType: "CL8",
      qtyLf: 400,
      topRail: true,
      terminalsManual: 4,
      gate: { type: "14x8", qty: 2 },
    });
    expect(r.terminalsTotal).toBe(8);
    expect(qty(r, BOM_NAMES.cl8Wire)).toBe(8);
    expect(qty(r, BOM_NAMES.cl8LinePost)).toBe(40);
    expect(qty(r, BOM_NAMES.ties)).toBe(600);
    expect(qty(r, BOM_NAMES.tube138)).toBe(20);
    expect(qty(r, BOM_NAMES.loopCap)).toBe(40);
    expect(qty(r, BOM_NAMES.cl8Terminal)).toBe(8);
    expect(qty(r, BOM_NAMES.cl8TensionBar)).toBe(8);
    expect(qty(r, BOM_NAMES.braceBand)).toBe(8);
    expect(qty(r, BOM_NAMES.tensionBand)).toBe(32);
    expect(qty(r, BOM_NAMES.railEnd)).toBe(8);
    expect(qty(r, BOM_NAMES.clBolts)).toBe(8 + 32 + 8);
    expect(qty(r, "14x8")).toBe(2);
  });

  it("CL6 temp tension-band multiplier *3", () => {
    const r = calculateBom({
      fenceType: "CL6",
      qtyLf: 50,
      topRail: false,
      terminalsManual: 2,
    });
    expect(qty(r, BOM_NAMES.tensionBand)).toBe(6);
    expect(qty(r, BOM_NAMES.cl6TensionBar)).toBe(2);
    expect(qty(r, BOM_NAMES.braceBand)).toBe(2);
    expect(qty(r, BOM_NAMES.clBolts)).toBe(2 + 6 + 0);
  });

  it("bottom rail: same 1-3/8 tube + boulevard clamp per line post + rail ends", () => {
    const r = calculateBom({
      fenceType: "CL6",
      qtyLf: 100,
      topRail: false,
      bottomRail: true,
      terminalsManual: 2,
    });
    expect(qty(r, BOM_NAMES.tube138)).toBe(5);
    expect(qty(r, BOM_NAMES.boulevardClamp)).toBe(10);
    expect(qty(r, BOM_NAMES.loopCap)).toBe(0);
    expect(qty(r, BOM_NAMES.railEnd)).toBe(2);
    expect(qty(r, BOM_NAMES.ties)).toBe(80);
    expect(qty(r, BOM_NAMES.clBolts)).toBe(2 + 6 + 2);
  });

  it("both rails: 2× sticks, top loop caps, bottom boulevard, rail ends ×2", () => {
    const r = calculateBom({
      fenceType: "CL6",
      qtyLf: 100,
      topRail: true,
      bottomRail: true,
      terminalsManual: 2,
    });
    expect(qty(r, BOM_NAMES.tube138)).toBe(10);
    expect(qty(r, BOM_NAMES.loopCap)).toBe(10);
    expect(qty(r, BOM_NAMES.boulevardClamp)).toBe(10);
    expect(qty(r, BOM_NAMES.railEnd)).toBe(4);
    expect(qty(r, BOM_NAMES.ties)).toBe(80 + 50);
    expect(qty(r, BOM_NAMES.clBolts)).toBe(2 + 6 + 4);
  });

  it("terminal hybrid: (gate + gate2) * 2 + manual", () => {
    const r = calculateBom({
      fenceType: "CL6",
      qtyLf: 100,
      topRail: false,
      gate: { type: "5x6", qty: 1 },
      gate2: { type: "6x6", qty: 1 },
      terminalsManual: 3,
    });
    expect(r.terminalsTotal).toBe(7);
    expect(qty(r, BOM_NAMES.cl6Terminal)).toBe(7);
    expect(qty(r, BOM_NAMES.cl6TensionBar)).toBe(7);
    expect(qty(r, BOM_NAMES.tensionBand)).toBe(21);
  });
});

describe("chainlink plate mount", () => {
  it("CL6 plate: fence-height plate posts + bolts = 2×line + 4×terminals", () => {
    const r = calculateBom({
      fenceType: "CL6",
      qtyLf: 100,
      topRail: false,
      terminalsManual: 2,
      postMount: "plate",
    });
    expect(r.postMount).toBe("plate");
    expect(r.terminalsTotal).toBe(2);
    expect(qty(r, BOM_NAMES.cl6LinePostPlate)).toBe(10);
    expect(qty(r, BOM_NAMES.cl6TerminalPlate)).toBe(2);
    expect(qty(r, BOM_NAMES.screwBolt38x3)).toBe(10 * 2 + 2 * 4);
    expect(qty(r, BOM_NAMES.cl6LinePost)).toBe(0);
    expect(qty(r, BOM_NAMES.cl6Terminal)).toBe(0);
    expect(qty(r, BOM_NAMES.cl6Wire)).toBe(2);
    expect(qty(r, BOM_NAMES.ties)).toBe(80);
    expect(qty(r, BOM_NAMES.cl6TensionBar)).toBe(2);
    expect(r.notes.some((n) => /plate \(concrete\)/i.test(n))).toBe(true);
  });

  it("CL8 plate: 8′ plate posts and bolt math", () => {
    const r = calculateBom({
      fenceType: "CL8",
      qtyLf: 216,
      topRail: false,
      postMount: "plate",
    });
    expect(qty(r, BOM_NAMES.cl8LinePostPlate)).toBe(22);
    expect(qty(r, BOM_NAMES.cl8TerminalPlate)).toBe(0);
    expect(qty(r, BOM_NAMES.screwBolt38x3)).toBe(44);
    expect(qty(r, BOM_NAMES.cl8LinePost)).toBe(0);
    expect(qty(r, BOM_NAMES.cl8Terminal)).toBe(0);
    expect(qty(r, BOM_NAMES.cl8Wire)).toBe(5);
    expect(qty(r, BOM_NAMES.ties)).toBe(216);
  });

  it("CL6 plate mixed terminals: gates*2 + manual", () => {
    const r = calculateBom({
      fenceType: "CL6",
      qtyLf: 100,
      topRail: false,
      postMount: "plate",
      gate: { type: "5x6", qty: 1 },
      gate2: { type: "6x6", qty: 1 },
      terminalsManual: 3,
    });
    expect(r.terminalsTotal).toBe(7);
    expect(qty(r, BOM_NAMES.cl6LinePostPlate)).toBe(10);
    expect(qty(r, BOM_NAMES.cl6TerminalPlate)).toBe(7);
    expect(qty(r, BOM_NAMES.screwBolt38x3)).toBe(10 * 2 + 7 * 4);
    expect(qty(r, BOM_NAMES.cl6Terminal)).toBe(0);
    expect(qty(r, "5x6")).toBe(1);
    expect(qty(r, "6x6")).toBe(1);
  });

  it("CL8 plate mixed terminals: gate qty + manual", () => {
    const r = calculateBom({
      fenceType: "CL8",
      qtyLf: 400,
      topRail: true,
      postMount: "plate",
      terminalsManual: 4,
      gate: { type: "14x8", qty: 2 },
    });
    expect(r.terminalsTotal).toBe(8);
    expect(qty(r, BOM_NAMES.cl8LinePostPlate)).toBe(40);
    expect(qty(r, BOM_NAMES.cl8TerminalPlate)).toBe(8);
    expect(qty(r, BOM_NAMES.screwBolt38x3)).toBe(40 * 2 + 8 * 4);
    expect(qty(r, BOM_NAMES.cl8LinePost)).toBe(0);
    expect(qty(r, BOM_NAMES.cl8Terminal)).toBe(0);
    expect(qty(r, BOM_NAMES.tube138)).toBe(20);
    expect(qty(r, BOM_NAMES.loopCap)).toBe(40);
    expect(qty(r, "14x8")).toBe(2);
  });

  it("driven (default or explicit) does not emit plate posts or SCREW-BOLT+", () => {
    const omitted = calculateBom({ fenceType: "CL6", qtyLf: 100, topRail: false, terminalsManual: 2 });
    const driven = calculateBom({
      fenceType: "CL6",
      qtyLf: 100,
      topRail: false,
      terminalsManual: 2,
      postMount: "driven",
    });
    expect(omitted.lines).toEqual(driven.lines);
    expect(qty(driven, BOM_NAMES.cl6LinePost)).toBe(10);
    expect(qty(driven, BOM_NAMES.cl6Terminal)).toBe(2);
    expect(qty(driven, BOM_NAMES.cl6LinePostPlate)).toBe(0);
    expect(qty(driven, BOM_NAMES.screwBolt38x3)).toBe(0);
    expect(driven.postMount).toBe("driven");
  });

  it("CL6+1 plate keeps barb pack on plate line-post count", () => {
    const r = calculateBom({
      fenceType: "CL6+1",
      qtyLf: 100,
      terminalsManual: 2,
      postMount: "plate",
    });
    expect(qty(r, BOM_NAMES.cl6LinePostPlate)).toBe(10);
    expect(qty(r, BOM_NAMES.cl6LinePost)).toBe(0);
    expect(qty(r, BOM_NAMES.barbArm)).toBe(10);
    expect(qty(r, BOM_NAMES.barbWire)).toBe(1);
    expect(qty(r, BOM_NAMES.screwBolt38x3)).toBe(10 * 2 + 2 * 4);
  });

  it("panel and barricade ignore postMount plate", () => {
    const panel = calculateBom({ fenceType: "6x10", qtyLf: 100, postMount: "plate" });
    expect(qty(panel, "6x10")).toBe(10);
    expect(qty(panel, BOM_NAMES.cl6LinePostPlate)).toBe(0);
    expect(qty(panel, BOM_NAMES.screwBolt38x3)).toBe(0);
    expect(panel.notes.some((n) => /ignored for panels/i.test(n))).toBe(true);

    const barb = calculateBom({ fenceType: "BARRICADE", qtyLf: 70, postMount: "plate" });
    expect(qty(barb, BOM_NAMES.barricade)).toBe(10);
    expect(qty(barb, BOM_NAMES.screwBolt38x3)).toBe(0);
  });
});

describe("barb CL6+1 / CL8+1", () => {
  it("CL6+1: arms=line posts, rolls=CEIL((LF*3)/1320), +3 bands per terminal, top rail defaults on", () => {
    const r = calculateBom({
      fenceType: "CL6+1",
      qtyLf: 100,
      terminalsManual: 2,
    });
    expect(qty(r, BOM_NAMES.cl6LinePost)).toBe(10);
    expect(qty(r, BOM_NAMES.barbArm)).toBe(10);
    expect(qty(r, BOM_NAMES.barbWire)).toBe(1);
    expect(qty(r, BOM_NAMES.tensionBand)).toBe(6 + 6);
    expect(qty(r, BOM_NAMES.tube138)).toBe(5);
    expect(qty(r, BOM_NAMES.loopCap)).toBe(10);
    expect(qty(r, BOM_NAMES.clBolts)).toBe(2 + 12 + 2);
    expect(r.notes.some((n) => /top rail defaulted/i.test(n))).toBe(true);
  });

  it("CL8+1 uses CL8 posts/bands and 1320′ rolls", () => {
    const r = calculateBom({
      fenceType: "CL8+1",
      qtyLf: 440,
      topRail: true,
      terminalsManual: 1,
    });
    expect(qty(r, BOM_NAMES.cl8LinePost)).toBe(44);
    expect(qty(r, BOM_NAMES.barbArm)).toBe(44);
    expect(qty(r, BOM_NAMES.barbWire)).toBe(1);
    expect(qty(r, BOM_NAMES.tensionBand)).toBe(4 + 3);
    const over = calculateBom({
      fenceType: "CL8+1",
      qtyLf: 441,
      topRail: false,
      terminalsManual: 0,
    });
    expect(qty(over, BOM_NAMES.barbWire)).toBe(2);
    expect(qty(over, BOM_NAMES.tube138)).toBe(0);
  });

  it("top rail can be overridden off on +1", () => {
    const r = calculateBom({ fenceType: "CL6+1", qtyLf: 50, topRail: false });
    expect(qty(r, BOM_NAMES.tube138)).toBe(0);
    expect(r.notes.some((n) => /overridden off/i.test(n))).toBe(true);
  });
});

describe("screens", () => {
  it("CEIL(LF/50) rolls and zip ties = rolls*110", () => {
    const r = calculateBom({ fenceType: "CL6", qtyLf: 170, topRail: false, screenSku: "BLACK6" });
    expect(qty(r, "BLACK6")).toBe(4);
    expect(qty(r, BOM_NAMES.zipTies)).toBe(440);
  });

  it("Yes/No is not a SKU", () => {
    const r = calculateBom({ fenceType: "6x10", qtyLf: 100, screenSku: "Yes" });
    expect(qty(r, BOM_NAMES.zipTies)).toBe(0);
    expect(r.warnings.some((w) => /not a SKU/i.test(w))).toBe(true);
  });

  it("CUSTOM still emits with a catalog-gap warning", () => {
    const r = calculateBom({ fenceType: "6x12", qtyLf: 50, screenSku: "CUSTOM" });
    expect(qty(r, "CUSTOM")).toBe(1);
    expect(qty(r, BOM_NAMES.zipTies)).toBe(110);
    expect(r.warnings.some((w) => /CUSTOM/i.test(w))).toBe(true);
  });
});

describe("gates", () => {
  it("swing hardware from Excel", () => {
    const r = calculateBom({
      fenceType: "6x12",
      qtyLf: 108,
      weightMode: "BFOOT",
      gate: { type: "12x6", qty: 1 },
    });
    expect(qty(r, "12x6")).toBe(1);
    expect(qty(r, BOM_NAMES.swingRoller)).toBe(1);
    expect(qty(r, BOM_NAMES.mh)).toBe(2);
    expect(qty(r, BOM_NAMES.cb38x3)).toBe(2);
    expect(qty(r, BOM_NAMES.fh)).toBe(2);
    expect(qty(r, BOM_NAMES.cb38x214)).toBe(2);
  });

  it("slide 15x6: carrier, safety×2, track brackets×6", () => {
    const r = calculateBom({
      fenceType: "CL6",
      qtyLf: 50,
      topRail: false,
      gate: { type: "15x6 SLIDE", qty: 1 },
    });
    expect(qty(r, "15x6 SLIDE")).toBe(1);
    expect(qty(r, BOM_NAMES.slideCarrier)).toBe(1);
    expect(qty(r, BOM_NAMES.slideSafetyRoller)).toBe(2);
    expect(qty(r, BOM_NAMES.trackBracket)).toBe(6);
    expect(qty(r, BOM_NAMES.swingRoller)).toBe(0);
  });

  it("slide 20x8: track brackets×8", () => {
    const r = calculateBom({
      fenceType: "CL8",
      qtyLf: 50,
      topRail: false,
      gate: { type: "20x8 SLIDE", qty: 1 },
    });
    expect(qty(r, BOM_NAMES.trackBracket)).toBe(8);
  });

  it("mixed 15/14 and 20 slide: *6 branch wins", () => {
    const r = calculateBom({
      fenceType: "CL6",
      qtyLf: 50,
      topRail: false,
      gate: { type: "15x6 SLIDE", qty: 1 },
      gate2: { type: "20x6 SLIDE", qty: 1 },
    });
    expect(qty(r, BOM_NAMES.slideCarrier)).toBe(2);
    expect(qty(r, BOM_NAMES.slideSafetyRoller)).toBe(4);
    expect(qty(r, BOM_NAMES.trackBracket)).toBe(12);
  });

  it("GATE + GATE2 swing counts stack", () => {
    const r = calculateBom({
      fenceType: "6x10",
      qtyLf: 20,
      gate: { type: "10x8", qty: 2 },
      gate2: { type: "5x6", qty: 1 },
    });
    expect(qty(r, BOM_NAMES.swingRoller)).toBe(3);
    expect(qty(r, BOM_NAMES.mh)).toBe(6);
  });

  it("12x8 gap: body still emitted as swing with warning", () => {
    const r = calculateBom({
      fenceType: "8x10",
      qtyLf: 20,
      gate: { type: "12x8", qty: 1 },
    });
    expect(qty(r, "12x8")).toBe(1);
    expect(qty(r, BOM_NAMES.swingRoller)).toBe(1);
    expect(r.warnings.some((w) => /12x8/.test(w))).toBe(true);
  });

  it("4x8 is removed from GATE_TYPES and demo seed", () => {
    expect((GATE_TYPES as readonly string[]).includes("4x8")).toBe(false);
    expect(KNOWN_SKU_GAPS.has("4x8")).toBe(true);
    expect(BOM_SEED_ITEMS.some((i) => i.name === "4x8" || i.sku === "4x8")).toBe(false);
  });

  it("4x8 is a documented gap if it still appears (import/legacy), not a catalog match", () => {
    const r = calculateBom({
      fenceType: "6x10",
      qtyLf: 20,
      gate: { type: "4x8", qty: 1 },
    });
    expect(qty(r, "4x8")).toBe(1);
    expect(r.warnings.some((w) => /4x8/.test(w) && /catalog gap/i.test(w))).toBe(true);

    const catalog = BOM_SEED_ITEMS.map((item, idx) => ({
      id: String(idx),
      sku: item.sku,
      name: item.name,
    }));
    const body = bomLinesToMaterials(r.lines, catalog).find((m) => m.skuOrName === "4x8");
    expect(body?.catalogMatched).toBe(false);
    expect(body?.itemName).toBe("4x8");
  });

  it("4x6 remains a documented gap: warning + unmatched in demo seed", () => {
    const r = calculateBom({
      fenceType: "6x10",
      qtyLf: 20,
      gate: { type: "4x6", qty: 1 },
    });
    expect(qty(r, "4x6")).toBe(1);
    expect(r.warnings.some((w) => /4x6/.test(w) && /catalog gap/i.test(w))).toBe(true);
    const catalog = BOM_SEED_ITEMS.map((item, idx) => ({
      id: String(idx),
      sku: item.sku,
      name: item.name,
    }));
    const body = bomLinesToMaterials(r.lines, catalog).find((m) => m.skuOrName === "4x6");
    expect(body?.catalogMatched).toBe(false);
  });
});

describe("guardrails", () => {
  it("unknown fence type → no fence recipe + warning (import rule)", () => {
    const r = calculateBom({ fenceType: "6 Ft Panels", qtyLf: 100 });
    expect(r.fenceType).toBeNull();
    expect(r.lines).toHaveLength(0);
    expect(r.warnings.some((w) => /unrecognized fence type/i.test(w))).toBe(true);
  });

  it("Install vs Pickup do not change quantities", () => {
    const input = {
      fenceType: "CL6" as const,
      qtyLf: 100,
      topRail: true,
      terminalsManual: 2,
      gate: { type: "5x6", qty: 1 },
      screenSku: "GREEN6",
    };
    const inst = calculateBom({ ...input, jobType: "Install" });
    const pu = calculateBom({ ...input, jobType: "Pickup" });
    expect(inst.lines).toEqual(pu.lines);
  });

  it("gates still BOM when LF is 0", () => {
    const r = calculateBom({
      fenceType: "CL8",
      qtyLf: 0,
      gate: { type: "10x8", qty: 2 },
    });
    expect(qty(r, "10x8")).toBe(2);
    expect(qty(r, BOM_NAMES.swingRoller)).toBe(2);
    expect(qty(r, BOM_NAMES.cl8Wire)).toBe(0);
  });
});

describe("catalog matching", () => {
  const catalog = [
    { id: "1", sku: "SADDLE-CLAMP", name: "SADDLE CLAMP" },
    { id: "2", sku: "TOP-RAIL", name: "TOP RAIL" },
    { id: "3", sku: "6x10", name: "6x10" },
  ];

  it("matches SADDLE CLAMPS to singular inventory name", () => {
    expect(matchCatalogItem("SADDLE CLAMPS", catalog)?.id).toBe("1");
  });

  it("matches 1-3/8 tube alias to TOP RAIL", () => {
    expect(matchCatalogItem('1-3/8" TUBE', catalog)?.id).toBe("2");
  });

  it("bomLinesToMaterials links catalog or free-text with a note", () => {
    const r = calculateBom({ fenceType: "6x10", qtyLf: 10 });
    const mats = bomLinesToMaterials(r.lines, catalog);
    const panel = mats.find((m) => m.skuOrName === "6x10");
    expect(panel?.catalogMatched).toBe(true);
    expect(panel?.inventoryItemId).toBe("3");
    const stands = mats.find((m) => m.skuOrName === BOM_NAMES.tStands);
    expect(stands?.catalogMatched).toBe(false);
    expect(stands?.itemName).toBe(BOM_NAMES.tStands);
    expect(stands?.notes).toMatch(/no catalog match/i);
  });

  it("demo seed includes every GATE_TYPES body except documented gaps", () => {
    const names = new Set(BOM_SEED_ITEMS.map((i) => i.name));
    for (const g of gateTypesExpectedInSeed()) {
      expect(names.has(g) || BOM_SEED_ITEMS.some((i) => i.sku === g.replace(/\s+/g, "-"))).toBe(
        true
      );
    }
    for (const gap of ["4x6", "4x8", "12x8", "CUSTOM"] as const) {
      expect(KNOWN_SKU_GAPS.has(gap)).toBe(true);
      expect(names.has(gap)).toBe(false);
    }
    expect((GATE_TYPES as readonly string[]).includes("4x8")).toBe(false);
  });

  it("demo seed includes plate posts (reusable) and SCREW-BOLT+ (consumable)", () => {
    const byName = new Map(BOM_SEED_ITEMS.map((i) => [i.name, i]));
    for (const name of [
      BOM_NAMES.cl6LinePostPlate,
      BOM_NAMES.cl8LinePostPlate,
      BOM_NAMES.cl6TerminalPlate,
      BOM_NAMES.cl8TerminalPlate,
    ]) {
      expect(byName.get(name)?.reusable).toBe(true);
    }
    expect(byName.get(BOM_NAMES.screwBolt38x3)?.reusable).toBe(false);
    expect(byName.get(BOM_NAMES.screwBolt38x3)?.sku).toBe("SCREW-BOLT-3-8x3");
  });

  it("matches SCREW-BOLT+ aliases (DeWalt / PFM1411240)", () => {
    const catalog = BOM_SEED_ITEMS.map((item, idx) => ({
      id: String(idx),
      sku: item.sku,
      name: item.name,
    }));
    const id = catalog.find((i) => i.name === BOM_NAMES.screwBolt38x3)?.id;
    expect(matchCatalogItem("SCREW-BOLT+ 3/8x3", catalog)?.id).toBe(id);
    expect(matchCatalogItem("PFM1411240", catalog)?.id).toBe(id);
    expect(matchCatalogItem("DeWalt SCREW-BOLT+", catalog)?.id).toBe(id);
  });
});
