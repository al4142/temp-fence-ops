import { JOB_TYPES } from "./job-constants";

export type MaterialInput = {
  inventoryItemId: string | null;
  itemName: string | null;
  quantity: number;
  notes: string | null;
};

export type LaborInput = {
  employeeId: string;
  regularHours: number;
  overtimeHours: number;
};

export type JobFormValues = {
  date: string; // YYYY-MM-DD
  branchId: string;
  class: string;
  orderNumber: string;
  customer: string;
  address: string;
  city: string;
  jobType: string;
  fenceType: string;
  qtyLf: string;
  screen: boolean;
  gates: string;
  notes: string;
  accountExec: string;
  revenue: string;
  lodging: string;
  freight: string;
  misc: string;
  materials: MaterialInput[];
  labor: LaborInput[];
};

export type JobFormPayload = {
  date: string;
  branchId: string;
  class: string | null;
  orderNumber: string;
  customer: string;
  address: string | null;
  city: string | null;
  jobType: string;
  fenceType: string | null;
  qtyLf: number | null;
  screen: boolean;
  gates: number;
  notes: string | null;
  accountExec: string | null;
  revenue: number;
  lodging: number;
  freight: number;
  misc: number;
  materials: MaterialInput[];
  labor: LaborInput[];
};

export type ActionResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string };

export type ValidateResult =
  | { ok: true; data: JobFormPayload }
  | { ok: false; error: string };

export function parseOptionalNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseRequiredNumber(
  raw: string | number | null | undefined,
  fallback = 0
): number {
  const n = parseOptionalNumber(raw);
  return n === null ? fallback : n;
}

export function emptyJobFormValues(defaults?: {
  branchId?: string;
  date?: string;
}): JobFormValues {
  const today = new Date();
  const ymd = defaults?.date ?? today.toISOString().slice(0, 10);
  return {
    date: ymd,
    branchId: defaults?.branchId ?? "",
    class: "EVENT",
    orderNumber: "",
    customer: "",
    address: "",
    city: "",
    jobType: "INST",
    fenceType: "",
    qtyLf: "",
    screen: false,
    gates: "0",
    notes: "",
    accountExec: "",
    revenue: "0",
    lodging: "0",
    freight: "0",
    misc: "0",
    materials: [],
    labor: [],
  };
}

export function validateAndNormalize(input: JobFormValues): ValidateResult {
  const orderNumber = input.orderNumber.trim();
  const branchId = input.branchId.trim();
  const date = input.date.trim();
  const jobType = input.jobType.trim().toUpperCase();
  const customer = input.customer.trim() || "TBD";

  if (!orderNumber) return { ok: false, error: "Order number is required." };
  if (!branchId) return { ok: false, error: "Branch is required." };
  if (!date) return { ok: false, error: "Date is required." };
  if (!jobType) return { ok: false, error: "Job type is required." };

  if (Number.isNaN(Date.parse(date))) {
    return { ok: false, error: "Date is invalid." };
  }

  const known = new Set<string>(JOB_TYPES as unknown as string[]);
  if (!known.has(jobType) && jobType.length > 12) {
    return { ok: false, error: "Job type looks invalid." };
  }

  const materials: MaterialInput[] = [];
  for (const m of input.materials ?? []) {
    const qty = parseOptionalNumber(m.quantity as unknown as string);
    if (qty === null || qty === 0) continue;
    if (qty < 0) return { ok: false, error: "Material quantity cannot be negative." };
    const inventoryItemId = m.inventoryItemId?.trim() || null;
    const itemName = m.itemName?.trim() || null;
    if (!inventoryItemId && !itemName) {
      return { ok: false, error: "Each material line needs an inventory item or a name." };
    }
    materials.push({
      inventoryItemId,
      itemName: inventoryItemId ? null : itemName,
      quantity: qty,
      notes: m.notes?.trim() || null,
    });
  }

  const labor: LaborInput[] = [];
  for (const l of input.labor ?? []) {
    const employeeId = l.employeeId?.trim();
    if (!employeeId) continue;
    const regularHours = parseRequiredNumber(l.regularHours as unknown as string, 0);
    const overtimeHours = parseRequiredNumber(l.overtimeHours as unknown as string, 0);
    if (regularHours < 0 || overtimeHours < 0) {
      return { ok: false, error: "Labor hours cannot be negative." };
    }
    if (regularHours === 0 && overtimeHours === 0) continue;
    labor.push({ employeeId, regularHours, overtimeHours });
  }

  return {
    ok: true,
    data: {
      date,
      branchId,
      class: input.class.trim() || null,
      orderNumber,
      customer,
      address: input.address.trim() || null,
      city: input.city.trim() || null,
      jobType,
      fenceType: input.fenceType.trim() || null,
      qtyLf: parseOptionalNumber(input.qtyLf),
      screen: Boolean(input.screen),
      gates: Math.max(0, Math.floor(parseRequiredNumber(input.gates, 0))),
      notes: input.notes.trim() || null,
      accountExec: input.accountExec.trim() || null,
      revenue: parseRequiredNumber(input.revenue, 0),
      lodging: parseRequiredNumber(input.lodging, 0),
      freight: parseRequiredNumber(input.freight, 0),
      misc: parseRequiredNumber(input.misc, 0),
      materials,
      labor,
    },
  };
}

/** Store date as UTC noon to avoid timezone day-shift for date-only fields. */
export function dateOnlyToUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}
