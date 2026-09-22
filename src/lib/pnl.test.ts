import { Prisma } from "@prisma/client";
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

describe("laborCostForLine", () => {
  it("keeps a 4-decimal hourly rate instead of rounding it to cents", () => {
    // Abel Gonzalez @ 21.0635: 8 reg + 2 OT @ 1.5x
    // 8 * 21.0635 + 2 * 21.0635 * 1.5 = 168.508 + 63.1905 = 231.6985
    const exact = new Prisma.Decimal("21.0635")
      .mul(8)
      .plus(new Prisma.Decimal("21.0635").mul(2).mul("1.5"));
    expect(exact.toString()).toBe("231.6985");

    expect(laborCostForLine(8, 2, "21.0635")).toBe(exact.toNumber());
    expect(laborCostForLine(8, 2, 21.0635)).toBe(exact.toNumber());
    expect(laborCostForLine(8, 2, new Prisma.Decimal("21.0635"))).toBe(exact.toNumber());

    const roundedToCents = laborCostForLine(8, 2, "21.06");
    expect(roundedToCents).not.toBe(exact.toNumber());
    expect(laborCostForLine(8, 0, "21.0635")).toBe(new Prisma.Decimal("21.0635").mul(8).toNumber());
  });

  it("still prices whole-dollar and 2-decimal rates the same way", () => {
    expect(laborCostForLine(8, 2, 25)).toBe(275);
    expect(laborCostForLine(6, 0, 22)).toBe(132);
    expect(laborCostForLine(0, 0, 40)).toBe(0);
    expect(laborCostForLine(10, 0, "20.50")).toBe(205);
    expect(laborCostForLine(8, 0, "22.0000")).toBe(176);
  });

  it("rolls the unrounded rate into order labor cost", () => {
    const pnl = buildOrderPnL([
      job({
        id: "inst",
        jobType: "Install",
        revenue: 1000,
        materials: [],
        labor: [
          {
            regularHours: 8,
            overtimeHours: 2,
            employee: { hourlyRate: "21.0635", name: "Abel Gonzalez" },
          },
        ],
      }),
    ]);
    expect(pnl!.laborCost).toBe(laborCostForLine(8, 2, "21.0635"));
    expect(pnl!.laborCost).not.toBe(laborCostForLine(8, 2, "21.06"));
  });
});

describe("countsTowardMaterialCost", () => {
  it("counts Install and Drop (outbound) only", () => {
    expect(countsTowardMaterialCost("Install")).toBe(true);
    expect(countsTowardMaterialCost("Drop")).toBe(true);
    expect(countsTowardMaterialCost("install")).toBe(true);
    expect(countsTowardMaterialCost("Pickup")).toBe(false);
    expect(countsTowardMaterialCost("Other")).toBe(false);
    expect(countsTowardMaterialCost("Site Walk")).toBe(false);
    expect(countsTowardMaterialCost("Relocate")).toBe(false);
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

  it("includes Relocate revenue and labor; materials are not outbound cost", () => {
    const pnl = buildOrderPnL([
      job({
        id: "rel",
        jobType: "Relocate",
        revenue: 650,
        labor: [
          {
            regularHours: 4,
            overtimeHours: 1,
            employee: { hourlyRate: 30, name: "Luis" },
          },
        ],
      }),
    ]);
    expect(pnl).not.toBeNull();
    expect(pnl!.jobCount).toBe(1);
    expect(pnl!.revenue).toBe(650);
    expect(pnl!.laborCost).toBe(laborCostForLine(4, 1, 30));
    expect(pnl!.materialCost).toBe(0);
    expect(pnl!.totalCost).toBe(pnl!.laborCost);
    expect(pnl!.grossProfit).toBe(650 - pnl!.laborCost);
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

describe("buildOrderPnL Cancelled jobs", () => {
  it("excludes Cancelled tickets from revenue, materials, labor, lodging, freight, misc, variance", () => {
    const pnl = buildOrderPnL([
      job({
        id: "cxl",
        jobType: "Install",
        status: "Cancelled",
        revenue: 4200,
        lodging: 200,
        freight: 150,
        misc: 75,
        labor: [
          {
            regularHours: 8,
            overtimeHours: 0,
            employee: { hourlyRate: 25, name: "Carlos" },
          },
        ],
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
    expect(pnl).toBeNull();
  });

  it("keeps an Active sibling on the same order; Cancelled sibling is ignored", () => {
    const pnl = buildOrderPnL([
      job({
        id: "inst",
        jobType: "Install",
        status: "Active",
        revenue: 4200,
      }),
      job({
        id: "cxl",
        jobType: "Install",
        status: "Cancelled",
        revenue: 9999,
        lodging: 500,
        labor: [
          {
            regularHours: 8,
            overtimeHours: 0,
            employee: { hourlyRate: 40, name: "Skip" },
          },
        ],
      }),
    ]);
    expect(pnl).not.toBeNull();
    expect(pnl!.jobCount).toBe(1);
    expect(pnl!.revenue).toBe(4200);
    expect(pnl!.materialCost).toBe(OUTBOUND_MATERIAL);
    expect(pnl!.laborCost).toBe(0);
    expect(pnl!.lodging).toBe(0);
    expect(pnl!.jobs.map((j) => j.id)).toEqual(["inst"]);
  });

  it("countsTowardMaterialCost is false for Cancelled Install; Active Install unchanged", () => {
    expect(countsTowardMaterialCost("Install", "Cancelled")).toBe(false);
    expect(countsTowardMaterialCost("Install")).toBe(true);
    expect(countsTowardMaterialCost("Install", "Active")).toBe(true);
  });
});
