import {
  allowsEmptyFenceAndMaterials,
  allowsZeroHourLabor,
  isJobStatus,
  isJobType,
  JOB_STATUS_ACTIVE,
  jobStatusMustBeMessage,
  jobTypeMustBeMessage,
  normalizeJobStatus,
  normalizeJobType,
} from "./job-constants";
import { VARIANCE_REASONS } from "./ops-constants";
import { normalizeFenceType, normalizePostMount, normalizeWeightMode } from "./bom/catalog";
import {
  emptyJobFenceSectionForm,
  resolveFormSections,
  summarizeSections,
  type JobFenceSectionForm,
  type StoredFenceSection,
} from "./bom/sections";

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

export type LodgingLineInput = {
  amount: number;
  facility: string | null;
  notes: string | null;
};

export type FreightLineInput = {
  company: string | null;
  cost: number;
  notes: string | null;
};

export type MiscLineInput = {
  amount: number;
  category: string | null;
  notes: string | null;
};

export type VarianceInput = {
  inventoryItemId: string | null;
  itemName: string | null;
  quantity: number;
  reason: string;
  notes: string | null;
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
  /** Active | Cancelled. Create always Active; edit may set Cancelled. */
  status: string;
  fenceType: string;
  qtyLf: string;
  screen: boolean;
  screenSku: string;
  gates: string;
  gateType: string;
  gateQty: string;
  gateType2: string;
  gateQty2: string;
  topRail: boolean;
  bottomRail: boolean;
  weightMode: string;
  postMount: string;
  terminalsManual: string;
  /** Source of truth for Generate BOM. Default is one driven chainlink section. */
  sections: JobFenceSectionForm[];
  notes: string;
  accountExec: string;
  revenue: string;
  lodgingLines: LodgingLineInput[];
  freightLines: FreightLineInput[];
  miscLines: MiscLineInput[];
  materials: MaterialInput[];
  labor: LaborInput[];
  variances: VarianceInput[];
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
  status: string;
  fenceType: string | null;
  qtyLf: number | null;
  screen: boolean;
  screenSku: string | null;
  gates: number;
  gateType: string | null;
  gateQty: number;
  gateType2: string | null;
  gateQty2: number;
  topRail: boolean;
  bottomRail: boolean;
  weightMode: string | null;
  postMount: string | null;
  terminalsManual: number;
  fenceSections: StoredFenceSection[];
  notes: string | null;
  accountExec: string | null;
  revenue: number;
  lodging: number;
  freight: number;
  misc: number;
  lodgingLines: LodgingLineInput[];
  freightLines: FreightLineInput[];
  miscLines: MiscLineInput[];
  materials: MaterialInput[];
  labor: LaborInput[];
  variances: VarianceInput[];
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
    jobType: "Install",
    status: JOB_STATUS_ACTIVE,
    fenceType: "",
    qtyLf: "",
    screen: false,
    screenSku: "",
    gates: "0",
    gateType: "",
    gateQty: "0",
    gateType2: "",
    gateQty2: "0",
    topRail: false,
    bottomRail: false,
    weightMode: "",
    postMount: "driven",
    terminalsManual: "0",
    sections: [emptyJobFenceSectionForm()],
    notes: "",
    accountExec: "",
    revenue: "0",
    lodgingLines: [],
    freightLines: [],
    miscLines: [],
    materials: [],
    labor: [],
    variances: [],
  };
}

export function validateAndNormalize(input: JobFormValues): ValidateResult {
  const orderNumber = input.orderNumber.trim();
  const branchId = input.branchId.trim();
  const date = input.date.trim();
  const jobType = normalizeJobType(input.jobType);
  const status = normalizeJobStatus(input.status);
  const customer = input.customer.trim() || "TBD";

  if (!orderNumber) return { ok: false, error: "Order number is required." };
  if (!branchId) return { ok: false, error: "Branch is required." };
  if (!date) return { ok: false, error: "Date is required." };
  if (!jobType) return { ok: false, error: "Job type is required." };
  if (!isJobType(jobType)) {
    return { ok: false, error: jobTypeMustBeMessage() };
  }
  if (!isJobStatus(status)) {
    return { ok: false, error: jobStatusMustBeMessage() };
  }

  if (Number.isNaN(Date.parse(date))) {
    return { ok: false, error: "Date is invalid." };
  }

  const materials: MaterialInput[] = [];
  for (const m of input.materials ?? []) {
    const qty = parseOptionalNumber(m.quantity as unknown as string);
    if (qty === null || qty === 0) continue;
    if (qty < 0) return { ok: false, error: "Material quantity cannot be negative." };
    const inventoryItemId = m.inventoryItemId?.trim() || null;
    const itemName = m.itemName?.trim() || null;
    if (!inventoryItemId && !itemName) {
      // Site Walk / Relocate: skip the form's empty placeholder row (qty defaults to 1).
      // Other types still require a catalog item or name when qty is non-zero.
      // Relocate does not keep 0-hour labor (allowsZeroHourLabor stays Site Walk only).
      if (allowsEmptyFenceAndMaterials(jobType)) continue;
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
    if (regularHours === 0 && overtimeHours === 0 && !allowsZeroHourLabor(jobType)) continue;
    labor.push({ employeeId, regularHours, overtimeHours });
  }

  const lodgingLines: LodgingLineInput[] = [];
  for (const row of input.lodgingLines ?? []) {
    const amount = parseRequiredNumber(row.amount as unknown as string, 0);
    if (amount === 0 && !(row.facility?.trim() || row.notes?.trim())) continue;
    if (amount < 0) return { ok: false, error: "Lodging amount cannot be negative." };
    lodgingLines.push({
      amount,
      facility: row.facility?.trim() || null,
      notes: row.notes?.trim() || null,
    });
  }

  const freightLines: FreightLineInput[] = [];
  for (const row of input.freightLines ?? []) {
    const cost = parseRequiredNumber(row.cost as unknown as string, 0);
    if (cost === 0 && !(row.company?.trim() || row.notes?.trim())) continue;
    if (cost < 0) return { ok: false, error: "Freight cost cannot be negative." };
    freightLines.push({
      company: row.company?.trim() || null,
      cost,
      notes: row.notes?.trim() || null,
    });
  }

  const miscLines: MiscLineInput[] = [];
  for (const row of input.miscLines ?? []) {
    const amount = parseRequiredNumber(row.amount as unknown as string, 0);
    if (amount === 0 && !(row.category?.trim() || row.notes?.trim())) continue;
    if (amount < 0) return { ok: false, error: "Misc amount cannot be negative." };
    miscLines.push({
      amount,
      category: row.category?.trim() || null,
      notes: row.notes?.trim() || null,
    });
  }

  const knownVariance = new Set<string>(VARIANCE_REASONS as unknown as string[]);
  const variances: VarianceInput[] = [];
  for (const row of input.variances ?? []) {
    const quantity = parseOptionalNumber(row.quantity as unknown as string);
    if (quantity === null || quantity === 0) continue;
    const reason = (row.reason ?? "").trim();
    if (!reason) return { ok: false, error: "Each variance line needs a reason." };
    if (!knownVariance.has(reason)) {
      return { ok: false, error: `Unknown variance reason: ${reason}` };
    }
    const inventoryItemId = row.inventoryItemId?.trim() || null;
    const itemName = row.itemName?.trim() || null;
    if (!inventoryItemId && !itemName) {
      return { ok: false, error: "Each variance line needs an inventory item or a name." };
    }
    variances.push({
      inventoryItemId,
      itemName: inventoryItemId ? null : itemName,
      quantity,
      reason,
      notes: row.notes?.trim() || null,
    });
  }

  const lodging = lodgingLines.reduce((s, l) => s + l.amount, 0);
  const freight = freightLines.reduce((s, l) => s + l.cost, 0);
  const misc = miscLines.reduce((s, l) => s + l.amount, 0);

  const resolvedSections = resolveFormSections(input);
  const fenceSections: StoredFenceSection[] = [];
  for (let i = 0; i < resolvedSections.length; i++) {
    const s = resolvedSections[i];
    const weightRaw = (s.weightMode ?? "").trim().toUpperCase();
    if (weightRaw && !normalizeWeightMode(weightRaw)) {
      return { ok: false, error: `Section ${i + 1}: weight mode must be BFOOT, SBAG, or blank.` };
    }
    const postMountRaw = (s.postMount ?? "").trim();
    const postMount = normalizePostMount(postMountRaw);
    if (postMountRaw && !postMount) {
      return { ok: false, error: `Section ${i + 1}: post mount must be driven, plate, or blank.` };
    }
    const qtyLf = parseOptionalNumber(s.qtyLf);
    if (s.qtyLf.trim() && qtyLf === null) {
      return { ok: false, error: `Section ${i + 1}: LF is not a number.` };
    }
    if (qtyLf !== null && qtyLf < 0) {
      return { ok: false, error: `Section ${i + 1}: LF cannot be negative.` };
    }
    fenceSections.push({
      fenceType: s.fenceType.trim() || null,
      qtyLf,
      topRail: Boolean(s.topRail),
      bottomRail: Boolean(s.bottomRail),
      weightMode: weightRaw || null,
      postMount: postMount === "plate" ? "plate" : "driven",
      gateType: (s.gateType ?? "").trim() || null,
      gateQty: Math.max(0, Math.floor(parseRequiredNumber(s.gateQty, 0))),
      gateType2: (s.gateType2 ?? "").trim() || null,
      gateQty2: Math.max(0, Math.floor(parseRequiredNumber(s.gateQty2, 0))),
      terminalsManual: Math.max(0, Math.floor(parseRequiredNumber(s.terminalsManual, 0))),
    });
  }

  const summary = summarizeSections(fenceSections);
  const screenSku = (input.screenSku ?? "").trim() || null;
  const screen = Boolean(screenSku) || Boolean(input.screen);
  const firstType = fenceSections[0]?.fenceType ?? (input.fenceType.trim() || null);
  const canonicalFirst = normalizeFenceType(firstType);

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
      status,
      fenceType: summary.fenceType ?? canonicalFirst,
      qtyLf: summary.qtyLf,
      screen,
      screenSku,
      gates: summary.gates,
      gateType: summary.gateType,
      gateQty: summary.gateQty,
      gateType2: summary.gateType2,
      gateQty2: summary.gateQty2,
      topRail: summary.topRail,
      bottomRail: summary.bottomRail,
      weightMode: summary.weightMode,
      postMount: summary.postMount,
      terminalsManual: summary.terminalsManual,
      fenceSections,
      notes: input.notes.trim() || null,
      accountExec: input.accountExec.trim() || null,
      revenue: parseRequiredNumber(input.revenue, 0),
      lodging,
      freight,
      misc,
      lodgingLines,
      freightLines,
      miscLines,
      materials,
      labor,
      variances,
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
