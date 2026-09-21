import { describe, expect, it } from "vitest";
import {
  buildOrderPnL,
  countsTowardMaterialCost,
  laborCostForLine,
  materialCostForLine,
  type JobForPnL,
} from "./pnl";

const UNIT_COST = 45;
const QTY = 40;
const OUTBOUND_MATERIAL = QTY * UNIT_COST;

function job(overrides: Partial<JobForPnL> & Pick<JobForPnL, "id" | "jobType">): JobForPnL {
  return {
    date: new Date("2026-03-05"),
    orderNumber: "ORD-1001",
    customer: "Bayfront Arts LLC",
    revenue: 0,
    lodging: 0,
    freight: 0,
    misc: 0,
    labor: [],
    materials: [
      {
        quantity: QTY,
        itemName: null,
        inventoryItem: { name: "6ft Panel", unitCost: UNIT_COST },
      },
    ],
    ...overrides,
  };
}

describe("countsTowardMaterialCost", () => {
  it("counts Install and Drop (outbound) only", () => {
    expect(countsTowardMaterialCost("Install")).toBe(true);
    expect(countsTowardMaterialCost("Drop")).toBe(true);
    expect(countsTowardMaterialCost("install")).toBe(true);
    expect(countsTowardMaterialCost("Pickup")).toBe(false);
    expect(countsTowardMaterialCost("Other")).toBe(false);
    expect(countsTowardMaterialCost("Site Walk")).toBe(false);
    expect(countsTowardMaterialCost("RELOCATE")).toBe(false);
  });
});

describe("buildOrderPnL materials", () => {
  it("counts Install + Pickup material cost once (not twice)", () => {
    const pnl = buildOrderPnL([
      job({
        id: "inst",
        jobType: "Install",
        revenue: 4200,
        labor: [
          {
            regularHours: 8,
            overtimeHours: 2,
            employee: { hourlyRate: 25, name: "Carlos" },
          },
        ],
      }),
      job({
        id: "pu",
        date: new Date("2026-03-10"),
        jobType: "Pickup",
        revenue: 800,
        labor: [
          {
            regularHours: 6,
            overtimeHours: 0,
            employee: { hourlyRate: 25, name: "Carlos" },
          },
        ],
      }),
    ]);

    expect(pnl).not.toBeNull();
    expect(pnl!.jobCount).toBe(2);
    expect(pnl!.revenue).toBe(5000);
    expect(pnl!.materialCost).toBe(OUTBOUND_MATERIAL);
    expect(pnl!.materialCost).not.toBe(OUTBOUND_MATERIAL * 2);
    // Pickup labor still rolls up; only materials are outbound-filtered.
    expect(pnl!.laborCost).toBe(
      laborCostForLine(8, 2, 25) + laborCostForLine(6, 0, 25)
    );
  });

  it("leaves Install-only material cost unchanged", () => {
    const pnl = buildOrderPnL([
      job({
        id: "inst",
        jobType: "Install",
        revenue: 4200,
        freight: 150,
        misc: 75,
      }),
    ]);

    expect(pnl!.materialCost).toBe(OUTBOUND_MATERIAL);
    expect(pnl!.freight).toBe(150);
    expect(pnl!.misc).toBe(75);
    expect(pnl!.totalCost).toBe(OUTBOUND_MATERIAL + 150 + 75);
    expect(pnl!.grossProfit).toBe(4200 - (OUTBOUND_MATERIAL + 150 + 75));
  });

  it("does not invent outbound cost for Pickup-only", () => {
    const pnl = buildOrderPnL([
      job({
        id: "pu",
        jobType: "Pickup",
        revenue: 800,
        freight: 100,
        labor: [
          {
            regularHours: 6,
            overtimeHours: 0,
            employee: { hourlyRate: 22, name: "Maria" },
          },
        ],
      }),
    ]);

    expect(pnl!.materialCost).toBe(0);
    expect(pnl!.laborCost).toBe(laborCostForLine(6, 0, 22));
    expect(pnl!.freight).toBe(100);
    expect(pnl!.totalCost).toBe(pnl!.laborCost + 100);
  });

  it("counts Drop as outbound the same way as Install", () => {
    const pnl = buildOrderPnL([
      job({ id: "drop", jobType: "Drop" }),
      job({ id: "pu", jobType: "Pickup" }),
    ]);
    expect(pnl!.materialCost).toBe(OUTBOUND_MATERIAL);
  });

  it("does not treat Other materials as outbound cost", () => {
    const pnl = buildOrderPnL([job({ id: "other", jobType: "Other" })]);
    expect(pnl!.materialCost).toBe(0);
  });

  it("does not treat Site Walk materials as outbound cost; 0-hour labor is $0", () => {
    const pnl = buildOrderPnL([
      job({
        id: "walk",
        jobType: "Site Walk",
        revenue: 0,
        labor: [
          {
            regularHours: 0,
            overtimeHours: 0,
            employee: { hourlyRate: 40, name: "Alex" },
          },
        ],
      }),
    ]);
    expect(pnl!.materialCost).toBe(0);
    expect(pnl!.laborCost).toBe(0);
    expect(pnl!.totalCost).toBe(0);
    expect(pnl!.grossProfit).toBe(0);
    expect(laborCostForLine(0, 0, 40)).toBe(0);
  });

  it("still applies Pickup variance; free-text outbound lines stay $0", () => {
    const pnl = buildOrderPnL([
      job({
        id: "inst",
        jobType: "Install",
        materials: [
          {
            quantity: QTY,
            itemName: null,
            inventoryItem: { name: "6ft Panel", unitCost: UNIT_COST },
          },
          {
            quantity: 10,
            itemName: "Caution Tape",
            inventoryItem: null,
          },
        ],
      }),
      job({
        id: "pu",
        jobType: "Pickup",
        variances: [
          {
            quantity: -2,
            reason: "Damaged on site",
            itemName: null,
            inventoryItem: { name: "6ft Panel", unitCost: UNIT_COST },
          },
        ],
      }),
    ]);

    expect(pnl!.materialCost).toBe(OUTBOUND_MATERIAL);
    expect(pnl!.varianceCost).toBe(materialCostForLine(2, UNIT_COST));
  });

  it("returns null for an empty job list", () => {
    expect(buildOrderPnL([])).toBeNull();
  });
});
