import { Prisma } from "@prisma/client";
import { formatCurrency } from "./format";
import { hourlyRateDecimalString, type HourlyRateValue } from "./hourly-rate";
import { inventorySignForJobType } from "./inventory";
import { isCancelledStatus } from "./job-constants";

export type JobForPnL = {
  id: string;
  date: Date;
  orderNumber: string;
  jobType: string;
  /** Active | Cancelled. Missing / blank treated as Active. */
  status?: string | null;
  customer: string;
  revenue: number;
  lodgingLines?: Array<{ amount: number }>;
  freightLines?: Array<{ cost: number }>;
  miscLines?: Array<{ amount: number }>;
  /** Fallback when lines not loaded */
  lodging?: number;
  freight?: number;
  misc?: number;
  labor: Array<{
    regularHours: number;
    overtimeHours: number;
    employee: { hourlyRate: HourlyRateValue; name: string };
  }>;
  materials: Array<{
    quantity: number;
    itemName: string | null;
    inventoryItem: { name: string; unitCost: number } | null;
  }>;
  variances?: Array<{
    quantity: number;
    reason: string;
    itemName: string | null;
    inventoryItem: { name: string; unitCost: number } | null;
  }>;
};

export type OrderPnL = {
  orderNumber: string;
  customer: string;
  jobCount: number;
  revenue: number;
  laborCost: number;
  materialCost: number;
  lodging: number;
  freight: number;
  misc: number;
  /** Material variance at unit cost (can be negative if returns) */
  varianceCost: number;
  totalCost: number;
  grossProfit: number;
  jobs: JobForPnL[];
};

/**
 * OT billed at 1.5x for P&L demo purposes.
 * The rate is multiplied at full precision (up to 4 decimal places). It is
 * not rounded to cents before the hours are applied.
 */
export function laborCostForLine(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: HourlyRateValue
): number {
  const rateText = hourlyRateDecimalString(hourlyRate);
  const rate = new Prisma.Decimal(rateText ?? "0");
  const cost = rate
    .mul(new Prisma.Decimal(regularHours))
    .plus(rate.mul(new Prisma.Decimal(overtimeHours)).mul("1.5"));
  return cost.toNumber();
}

export function materialCostForLine(quantity: number, unitCost: number): number {
  return quantity * unitCost;
}

/**
 * Material COGS is outbound usage only (Install / Drop).
 *
 * Install and Pickup share the same BOM quantities (recipes do not flip sign).
 * Pickup is a warehouse return, not a second consumption — summing Pickup
 * qty × catalog unitCost would double-count materials on the same order.
 *
 * Net install−pickup per SKU was considered; outbound-only matches inventory
 * domain (cost when goods leave the yard) and does not invent a credit that
 * would zero reusable rental assets. Consumables stay consumed because Pickup
 * does not restock them; P&L still costs them on the outbound ticket.
 * Damage / missing is JobMaterialVariance, not Pickup BOM.
 *
 * Unit cost is the current catalog `inventoryItem.unitCost`. JobMaterial has
 * no per-line cost snapshot.
 */
export function countsTowardMaterialCost(
  jobType: string,
  status?: string | null
): boolean {
  if (isCancelledStatus(status)) return false;
  return inventorySignForJobType(jobType, status) < 0;
}

function sumLodging(job: JobForPnL): number {
  if (job.lodgingLines && job.lodgingLines.length > 0) {
    return job.lodgingLines.reduce((s, l) => s + l.amount, 0);
  }
  return job.lodging ?? 0;
}

function sumFreight(job: JobForPnL): number {
  if (job.freightLines && job.freightLines.length > 0) {
    return job.freightLines.reduce((s, l) => s + l.cost, 0);
  }
  return job.freight ?? 0;
}

function sumMisc(job: JobForPnL): number {
  if (job.miscLines && job.miscLines.length > 0) {
    return job.miscLines.reduce((s, l) => s + l.amount, 0);
  }
  return job.misc ?? 0;
}

export function buildOrderPnL(jobs: JobForPnL[]): OrderPnL | null {
  if (jobs.length === 0) return null;
  const included = jobs.filter((job) => !isCancelledStatus(job.status));
  if (included.length === 0) return null;
  const orderNumber = included[0].orderNumber;
  const customer = included[0].customer;

  let revenue = 0;
  let lodging = 0;
  let freight = 0;
  let misc = 0;
  let laborCost = 0;
  let materialCost = 0;
  let varianceCost = 0;

  for (const job of included) {
    revenue += job.revenue;
    lodging += sumLodging(job);
    freight += sumFreight(job);
    misc += sumMisc(job);
    for (const line of job.labor) {
      laborCost += laborCostForLine(
        line.regularHours,
        line.overtimeHours,
        line.employee.hourlyRate
      );
    }
    if (countsTowardMaterialCost(job.jobType, job.status)) {
      for (const mat of job.materials) {
        const unitCost = mat.inventoryItem?.unitCost ?? 0;
        materialCost += materialCostForLine(mat.quantity, unitCost);
      }
    }
    for (const v of job.variances ?? []) {
      const unitCost = v.inventoryItem?.unitCost ?? 0;
      // Extra used / damage (negative qty leaving yard) increases cost as abs(qty)*cost
      // Returned unused (positive) reduces cost
      varianceCost += materialCostForLine(-v.quantity, unitCost);
    }
  }

  const totalCost =
    laborCost + materialCost + lodging + freight + misc + varianceCost;
  return {
    orderNumber,
    customer,
    jobCount: included.length,
    revenue,
    laborCost,
    materialCost,
    lodging,
    freight,
    misc,
    varianceCost,
    totalCost,
    grossProfit: revenue - totalCost,
    jobs: included,
  };
}

export function pnlSummaryLines(pnl: OrderPnL): string[] {
  return [
    `Revenue: ${formatCurrency(pnl.revenue)}`,
    `Labor: ${formatCurrency(pnl.laborCost)}`,
    `Materials (at unit cost): ${formatCurrency(pnl.materialCost)}`,
    `Lodging: ${formatCurrency(pnl.lodging)}`,
    `Freight: ${formatCurrency(pnl.freight)}`,
    `Misc: ${formatCurrency(pnl.misc)}`,
    `Material variance: ${formatCurrency(pnl.varianceCost)}`,
    `Total cost: ${formatCurrency(pnl.totalCost)}`,
    `Gross profit: ${formatCurrency(pnl.grossProfit)}`,
  ];
}
