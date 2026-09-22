import ExcelJS from "exceljs";
import { laborCostForLine } from "@/lib/pnl";
import { formatDate } from "@/lib/format";

export type ExportJob = {
  id: string;
  date: Date;
  orderNumber: string;
  customer: string;
  address: string | null;
  city: string | null;
  jobType: string;
  status?: string | null;
  fenceType: string | null;
  qtyLf: number | null;
  screen: boolean;
  screenSku?: string | null;
  gates: number;
  gateType?: string | null;
  gateQty?: number;
  gateType2?: string | null;
  gateQty2?: number;
  topRail?: boolean;
  bottomRail?: boolean;
  weightMode?: string | null;
  postMount?: string | null;
  terminalsManual?: number;
  fenceSections?: unknown;
  notes: string | null;
  accountExec: string | null;
  contact1?: string | null;
  contact2?: string | null;
  revenue: number;
  branch: { code: string; name: string };
  materials: Array<{
    quantity: number;
    notes: string | null;
    itemName: string | null;
    inventoryItem: { sku: string; name: string; unit: string } | null;
  }>;
  labor: Array<{
    regularHours: number;
    overtimeHours: number;
    employee: { name: string; position: string; hourlyRate: number };
  }>;
  lodgingLines: Array<{ amount: number; facility: string | null; notes: string | null }>;
  freightLines: Array<{ cost: number; company: string | null; notes: string | null }>;
  miscLines: Array<{ amount: number; category: string | null; notes: string | null }>;
  variances: Array<{
    quantity: number;
    reason: string;
    notes: string | null;
    itemName: string | null;
    inventoryItem: { sku: string; name: string } | null;
  }>;
};

function safeName(s: string): string {
  return s.replace(/[^\w.-]+/g, "_").slice(0, 80);
}

export function exportFilename(job: ExportJob): string {
  const d = job.date.toISOString().slice(0, 10);
  return `Project_${safeName(job.orderNumber)}_${d}_${job.branch.code}.xlsx`;
}

function formatExportGates(job: ExportJob): string {
  const parts: string[] = [];
  if (job.gateType && job.gateQty) parts.push(`${job.gateType} × ${job.gateQty}`);
  if (job.gateType2 && job.gateQty2) parts.push(`${job.gateType2} × ${job.gateQty2}`);
  if (parts.length) return parts.join(", ");
  return String(job.gates);
}

export async function buildProjectWorkbook(job: ExportJob): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Temp Fence Ops";
  wb.created = new Date();

  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 22 },
    { header: "Value", key: "value", width: 48 },
  ];
  const site = [job.address, job.city].filter(Boolean).join(", ");
  const rows: Array<[string, string | number | boolean]> = [
    ["Order #", job.orderNumber],
    ["Date", formatDate(job.date)],
    ["Yard", `${job.branch.code} - ${job.branch.name}`],
    ["Customer", job.customer],
    ["Address", site || "-"],
    ["Job type", job.jobType],
    ["Status", job.status ?? "Active"],
    ["LF", job.qtyLf ?? ""],
    ["Fence type", job.fenceType ?? ""],
    ["Top rail", job.topRail ? "Yes" : "No"],
    ["Bottom rail", job.bottomRail ? "Yes" : "No"],
    ["Weights", job.weightMode ?? ""],
    ["Post mount", job.postMount === "plate" ? "Plate (concrete)" : "Driven"],
    [
      "Fence sections",
      Array.isArray(job.fenceSections) ? `${job.fenceSections.length} saved` : "legacy (1)",
    ],
    ["Gates", formatExportGates(job)],
    ["Screen", job.screenSku || (job.screen ? "Yes" : "No")],
    ["Manual terminals", job.terminalsManual ?? 0],
    ["Account exec", job.accountExec ?? ""],
    ["Revenue", job.revenue],
    ["Contact 1", job.contact1 ?? ""],
    ["Contact 2", job.contact2 ?? ""],
    ["Notes", job.notes ?? ""],
  ];
  for (const [field, value] of rows) {
    summary.addRow({ field, value });
  }

  const materials = wb.addWorksheet("Materials");
  materials.columns = [
    { header: "SKU", key: "sku", width: 14 },
    { header: "Item", key: "item", width: 32 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Unit", key: "unit", width: 8 },
    { header: "Notes", key: "notes", width: 28 },
  ];
  for (const m of job.materials) {
    materials.addRow({
      sku: m.inventoryItem?.sku ?? "",
      item: m.inventoryItem?.name ?? m.itemName ?? "",
      qty: m.quantity,
      unit: m.inventoryItem?.unit ?? "",
      notes: m.notes ?? "",
    });
  }

  const labor = wb.addWorksheet("Labor");
  labor.columns = [
    { header: "Employee", key: "employee", width: 22 },
    { header: "Position", key: "position", width: 18 },
    { header: "Reg hrs", key: "reg", width: 10 },
    { header: "OT hrs", key: "ot", width: 10 },
    { header: "Rate", key: "rate", width: 10 },
    { header: "Cost", key: "cost", width: 12 },
  ];
  for (const l of job.labor) {
    labor.addRow({
      employee: l.employee.name,
      position: l.employee.position,
      reg: l.regularHours,
      ot: l.overtimeHours,
      rate: l.employee.hourlyRate,
      cost: laborCostForLine(l.regularHours, l.overtimeHours, l.employee.hourlyRate),
    });
  }

  const costs = wb.addWorksheet("Cost lines");
  costs.columns = [
    { header: "Type", key: "type", width: 12 },
    { header: "Detail", key: "detail", width: 28 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "Notes", key: "notes", width: 28 },
  ];
  for (const l of job.lodgingLines) {
    costs.addRow({
      type: "Lodging",
      detail: l.facility ?? "",
      amount: l.amount,
      notes: l.notes ?? "",
    });
  }
  for (const l of job.freightLines) {
    costs.addRow({
      type: "Freight",
      detail: l.company ?? "",
      amount: l.cost,
      notes: l.notes ?? "",
    });
  }
  for (const l of job.miscLines) {
    costs.addRow({
      type: "Misc",
      detail: l.category ?? "",
      amount: l.amount,
      notes: l.notes ?? "",
    });
  }

  if (job.variances.length > 0) {
    const varSheet = wb.addWorksheet("Material variance");
    varSheet.columns = [
      { header: "Item", key: "item", width: 28 },
      { header: "Qty", key: "qty", width: 10 },
      { header: "Reason", key: "reason", width: 18 },
      { header: "Notes", key: "notes", width: 28 },
    ];
    for (const v of job.variances) {
      varSheet.addRow({
        item: v.inventoryItem?.name ?? v.itemName ?? "",
        qty: v.quantity,
        reason: v.reason,
        notes: v.notes ?? "",
      });
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
