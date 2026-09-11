import { formatCurrency } from "./format";

export type JobForPnL = {
  id: string;
  date: Date;
  orderNumber: string;
  jobType: string;
  customer: string;
  revenue: number;
  lodging: number;
  freight: number;
  misc: number;
  labor: Array<{
    regularHours: number;
    overtimeHours: number;
    employee: { hourlyRate: number; name: string };
  }>;
  materials: Array<{
    quantity: number;
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
  totalCost: number;
  grossProfit: number;
  jobs: JobForPnL[];
};

/** OT billed at 1.5x for P&L demo purposes. */
export function laborCostForLine(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number
): number {
  return regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5;
}

export function materialCostForLine(quantity: number, unitCost: number): number {
  return quantity * unitCost;
}

export function buildOrderPnL(jobs: JobForPnL[]): OrderPnL | null {
  if (jobs.length === 0) return null;
  const orderNumber = jobs[0].orderNumber;
  const customer = jobs[0].customer;

  let revenue = 0;
  let lodging = 0;
  let freight = 0;
  let misc = 0;
  let laborCost = 0;
  let materialCost = 0;

  for (const job of jobs) {
    revenue += job.revenue;
    lodging += job.lodging;
    freight += job.freight;
    misc += job.misc;
    for (const line of job.labor) {
      laborCost += laborCostForLine(
        line.regularHours,
        line.overtimeHours,
        line.employee.hourlyRate
      );
    }
    for (const mat of job.materials) {
      const unitCost = mat.inventoryItem?.unitCost ?? 0;
      materialCost += materialCostForLine(mat.quantity, unitCost);
    }
  }

  const totalCost = laborCost + materialCost + lodging + freight + misc;
  return {
    orderNumber,
    customer,
    jobCount: jobs.length,
    revenue,
    laborCost,
    materialCost,
    lodging,
    freight,
    misc,
    totalCost,
    grossProfit: revenue - totalCost,
    jobs,
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
    `Total cost: ${formatCurrency(pnl.totalCost)}`,
    `Gross profit: ${formatCurrency(pnl.grossProfit)}`,
  ];
}
