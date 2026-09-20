import { parseCsv, rowToObject } from "./csv";
import { mapImportJobType, type JobType } from "./job-constants";
import {
  dateOnlyToUtc,
  emptyJobFormValues,
  parseOptionalNumber,
  parseRequiredNumber,
  validateAndNormalize,
  type JobFormPayload,
  type JobFormValues,
  type LaborInput,
  type MaterialInput,
} from "./job-form";
import { normalizeScreenSku } from "./bom/catalog";

/** Canonical field keys we map CSV columns onto. */
export const IMPORT_FIELDS = [
  "date",
  "branch",
  "class",
  "orderNumber",
  "customer",
  "address",
  "city",
  "jobType",
  "fenceType",
  "qtyLf",
  "screen",
  "notes",
  "accountExec",
  "revenue",
  "laborName",
  "laborHours",
  "laborOt",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export type ImportRowStatus = "accept" | "reject";

export type ImportRowAction = "create" | "update" | "skip" | "error";

export type ImportCommitMode = "upsert" | "skip_existing";

const ALIASES: Record<ImportField, string[]> = {
  date: ["date", "job date", "work date", "day"],
  branch: ["branch", "yard", "location", "branch code", "branchcode"],
  class: ["class", "job class", "category"],
  orderNumber: [
    "ordernumber",
    "order number",
    "order #",
    "order#",
    "order no",
    "orderno",
    "wo",
    "work order",
  ],
  customer: ["customer", "client", "company", "account"],
  address: ["address", "job address", "site address", "street"],
  city: ["city", "town"],
  jobType: ["jobtype", "job type", "type", "txn", "transaction", "activity"],
  fenceType: ["fencetype", "fence type", "fence", "product"],
  qtyLf: ["qtylf", "qty lf", "lf", "linear feet", "qty", "footage"],
  screen: ["screen", "privacy", "privacy screen"],
  notes: ["notes", "note", "comments", "comment", "remarks"],
  accountExec: ["accountexec", "account exec", "ae", "sales", "salesperson"],
  revenue: ["revenue", "amount", "total", "price", "bill", "billing"],
  laborName: ["labor", "assigned", "installer", "crew", "employee", "labor name"],
  laborHours: ["laborhours", "hours", "reg hours", "regular hours", "hrs"],
  laborOt: ["laborot", "ot", "ot hours", "overtime", "overtime hours"],
};

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ");
}

export function mapHeaders(headers: string[]): {
  mapping: Partial<Record<ImportField, number>>;
  materialColumns: Array<{ header: string; index: number; sku: string }>;
  unmapped: string[];
} {
  const mapping: Partial<Record<ImportField, number>> = {};
  const used = new Set<number>();
  const materialColumns: Array<{ header: string; index: number; sku: string }> = [];
  const unmapped: string[] = [];

  const aliasLookup = new Map<string, ImportField>();
  for (const field of IMPORT_FIELDS) {
    for (const a of ALIASES[field]) {
      aliasLookup.set(a, field);
    }
  }

  headers.forEach((h, index) => {
    const n = normHeader(h);
    if (!n) return;
    const field = aliasLookup.get(n);
    if (field && mapping[field] === undefined) {
      mapping[field] = index;
      used.add(index);
      return;
    }
    // Known material SKU-style columns (ALLCAPS with hyphen) - optional materials
    if (/^[A-Z0-9]+(-[A-Z0-9]+)+$/.test(h.trim()) || /^[A-Z]{2,}[-_][A-Z0-9]+$/i.test(h.trim())) {
      materialColumns.push({ header: h, index, sku: h.trim().toUpperCase() });
      used.add(index);
      return;
    }
  });

  headers.forEach((h, index) => {
    if (!used.has(index) && h.trim()) unmapped.push(h);
  });

  return { mapping, materialColumns, unmapped };
}

export type ParsedImportRow = {
  rowNumber: number;
  date: string;
  branchCode: string;
  class: string | null;
  orderNumber: string;
  customer: string;
  address: string | null;
  city: string | null;
  /** Mapped canonical type when accepted; empty when the type was rejected. */
  jobType: string;
  /** Raw CSV cell (trimmed). */
  originalType: string;
  /** Canonical type after the import alias map, or null if rejected. */
  mappedType: JobType | null;
  status: ImportRowStatus;
  rejectReason: string | null;
  fenceType: string | null;
  qtyLf: number | null;
  screen: boolean;
  screenSku: string | null;
  notes: string | null;
  accountExec: string | null;
  revenue: number;
  laborName: string | null;
  laborHours: number;
  laborOt: number;
  materials: Array<{ sku: string; quantity: number }>;
  action?: ImportRowAction;
  message?: string;
};

export type ImportPreviewSummary = {
  total: number;
  accepted: number;
  rejected: number;
  create: number;
  update: number;
  skip: number;
};

export type ImportLookupBranch = { id: string; code: string };
export type ImportLookupEmployee = { id: string; name: string; nameKey: string };
export type ImportLookupItem = {
  id: string;
  sku: string;
  branchId: string;
  active?: boolean;
};

export type ImportLookupContext = {
  branchesByCode: Map<string, ImportLookupBranch>;
  existingByKey: Map<string, { id: string }>;
  employees: ImportLookupEmployee[];
  items: ImportLookupItem[];
  mode: ImportCommitMode;
};

export type EvaluatedImportRow = {
  row: ParsedImportRow;
  payload: JobFormPayload | null;
  laborData: LaborInput[];
  materialData: MaterialInput[];
};

export type ImportCommitWrite = {
  action: "create" | "update" | "skip";
  rowNumber: number;
  existingId: string | null;
  payload: JobFormPayload;
  laborData: LaborInput[];
  materialData: MaterialInput[];
};

export type ImportCommitPlan =
  | { ok: true; writes: ImportCommitWrite[] }
  | { ok: false; error: string; rejected: Array<{ rowNumber: number; reason: string }> };

function cell(cells: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return (cells[index] ?? "").trim();
}

function parseBool(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "y" || v === "yes" || v === "true" || v === "x";
}

function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // M/D/YYYY or MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const mm = mdy[1].padStart(2, "0");
    const dd = mdy[2].padStart(2, "0");
    return `${mdy[3]}-${mm}-${dd}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    return new Date(t).toISOString().slice(0, 10);
  }
  return null;
}

function rejectRow(row: ParsedImportRow, reason: string): ParsedImportRow {
  return {
    ...row,
    status: "reject",
    rejectReason: reason,
    action: "error",
    message: reason,
  };
}

/** Idempotency key used by preview + commit: order number + date-only. */
export function importIdentityKey(orderNumber: string, date: string): string {
  return `${orderNumber.trim()}\t${date}`;
}

export function summarizeImportPreview(rows: ParsedImportRow[]): ImportPreviewSummary {
  const summary: ImportPreviewSummary = {
    total: rows.length,
    accepted: 0,
    rejected: 0,
    create: 0,
    update: 0,
    skip: 0,
  };
  for (const row of rows) {
    if (row.status === "reject") {
      summary.rejected++;
      continue;
    }
    summary.accepted++;
    if (row.action === "create") summary.create++;
    else if (row.action === "update") summary.update++;
    else if (row.action === "skip") summary.skip++;
  }
  return summary;
}

export function matchImportEmployee(
  laborName: string | null,
  employees: ImportLookupEmployee[]
): ImportLookupEmployee | null {
  if (!laborName) return null;
  const key = laborName.trim().toLowerCase();
  if (!key) return null;
  return (
    employees.find((e) => e.nameKey === key.replace(/\s+/g, "-")) ||
    employees.find((e) => e.name.toLowerCase() === key) ||
    null
  );
}

export function matchImportMaterials(
  materials: Array<{ sku: string; quantity: number }>,
  items: ImportLookupItem[],
  branchId: string
): { linked: MaterialInput[]; skipped: number } {
  const linked: MaterialInput[] = [];
  let skipped = 0;
  for (const m of materials) {
    const item = items.find(
      (i) =>
        i.branchId === branchId &&
        i.sku.toUpperCase() === m.sku.toUpperCase() &&
        i.active !== false
    );
    if (item) {
      linked.push({
        inventoryItemId: item.id,
        itemName: null,
        quantity: m.quantity,
        notes: null,
      });
    } else {
      skipped++;
    }
  }
  return { linked, skipped };
}

/** Build the same JobFormValues shape the create/edit form sends. */
export function importRowToFormValues(
  row: ParsedImportRow,
  opts: {
    branchId: string;
    laborEmployeeId?: string | null;
    materials?: MaterialInput[];
  }
): JobFormValues {
  const jobType = row.mappedType ?? row.jobType;
  return {
    ...emptyJobFormValues({ branchId: opts.branchId, date: row.date }),
    class: row.class ?? "",
    orderNumber: row.orderNumber,
    customer: row.customer,
    address: row.address ?? "",
    city: row.city ?? "",
    jobType,
    fenceType: row.fenceType ?? "",
    qtyLf: row.qtyLf === null || row.qtyLf === undefined ? "" : String(row.qtyLf),
    screen: row.screen,
    screenSku: row.screenSku ?? "",
    notes: row.notes ?? "",
    accountExec: row.accountExec ?? "",
    revenue: String(row.revenue),
    labor:
      opts.laborEmployeeId && (row.laborHours > 0 || row.laborOt > 0)
        ? [
            {
              employeeId: opts.laborEmployeeId,
              regularHours: row.laborHours,
              overtimeHours: row.laborOt,
            },
          ]
        : [],
    materials: opts.materials ?? [],
  };
}

export function parseImportText(text: string): {
  headers: string[];
  mapping: Partial<Record<ImportField, number>>;
  materialColumns: Array<{ header: string; index: number; sku: string }>;
  unmapped: string[];
  rows: ParsedImportRow[];
  parseErrors: string[];
} {
  const { headers, rows: rawRows } = parseCsv(text);
  const parseErrors: string[] = [];
  if (headers.length === 0) {
    return {
      headers: [],
      mapping: {},
      materialColumns: [],
      unmapped: [],
      rows: [],
      parseErrors: ["CSV is empty or has no header row."],
    };
  }

  const { mapping, materialColumns, unmapped } = mapHeaders(headers);
  if (mapping.date === undefined) parseErrors.push("Missing required column: date");
  if (mapping.orderNumber === undefined) parseErrors.push("Missing required column: orderNumber");
  if (mapping.branch === undefined) parseErrors.push("Missing required column: branch");
  if (mapping.jobType === undefined) parseErrors.push("Missing required column: jobType");

  const rows: ParsedImportRow[] = [];
  rawRows.forEach((cells, idx) => {
    const rowNumber = idx + 2; // 1-based incl header
    const dateRaw = cell(cells, mapping.date);
    const date = normalizeDate(dateRaw);
    const orderNumber = cell(cells, mapping.orderNumber);
    const branchCode = cell(cells, mapping.branch).toUpperCase();
    const originalType = cell(cells, mapping.jobType);
    const mapped = mapImportJobType(originalType);
    const customer = cell(cells, mapping.customer) || "TBD";

    const materials: Array<{ sku: string; quantity: number }> = [];
    for (const mc of materialColumns) {
      const qty = parseOptionalNumber(cell(cells, mc.index));
      if (qty !== null && qty !== 0) materials.push({ sku: mc.sku, quantity: qty });
    }

    const screenRaw = cell(cells, mapping.screen);
    const screenSku = normalizeScreenSku(screenRaw);

    const row: ParsedImportRow = {
      rowNumber,
      date: date ?? "",
      branchCode,
      class: cell(cells, mapping.class) || null,
      orderNumber,
      customer,
      address: cell(cells, mapping.address) || null,
      city: cell(cells, mapping.city) || null,
      jobType: mapped.ok ? mapped.mapped : "",
      originalType: mapped.original,
      mappedType: mapped.ok ? mapped.mapped : null,
      status: mapped.ok ? "accept" : "reject",
      rejectReason: mapped.ok ? null : mapped.reason,
      fenceType: cell(cells, mapping.fenceType) || null,
      qtyLf: parseOptionalNumber(cell(cells, mapping.qtyLf)),
      screen: Boolean(screenSku) || parseBool(screenRaw),
      screenSku,
      notes: cell(cells, mapping.notes) || null,
      accountExec: cell(cells, mapping.accountExec) || null,
      revenue: parseRequiredNumber(cell(cells, mapping.revenue), 0),
      laborName: cell(cells, mapping.laborName) || null,
      laborHours: parseRequiredNumber(cell(cells, mapping.laborHours), 0),
      laborOt: parseRequiredNumber(cell(cells, mapping.laborOt), 0),
      materials,
    };

    if (!mapped.ok) {
      row.action = "error";
      row.message = mapped.reason;
    }

    if (!date) {
      Object.assign(row, rejectRow(row, `Invalid or missing date (${dateRaw || "blank"})`));
    } else if (!orderNumber) {
      Object.assign(row, rejectRow(row, "Missing order number"));
    } else if (!branchCode) {
      Object.assign(row, rejectRow(row, "Missing branch"));
    }

    // Skip fully blank data rows
    const obj = rowToObject(headers, cells);
    if (Object.values(obj).every((v) => !v)) return;

    rows.push(row);
  });

  return { headers, mapping, materialColumns, unmapped, rows, parseErrors };
}

/**
 * Resolve branch / existing jobs / labor / materials and run the same
 * `validateAndNormalize` path as the job form.
 */
export function evaluateImportRows(
  rows: ParsedImportRow[],
  ctx: ImportLookupContext
): EvaluatedImportRow[] {
  const seenKeys = new Map<string, number>();
  return rows.map((input) => {
    if (input.status === "reject") {
      return { row: input, payload: null, laborData: [], materialData: [] };
    }

    const branch = ctx.branchesByCode.get(input.branchCode);
    if (!branch) {
      const row = rejectRow(input, `Unknown branch code "${input.branchCode}"`);
      return { row, payload: null, laborData: [], materialData: [] };
    }

    if (input.date && input.orderNumber) {
      const key = importIdentityKey(input.orderNumber, input.date);
      const first = seenKeys.get(key);
      if (first !== undefined) {
        const row = rejectRow(
          input,
          `Duplicate orderNumber + date (same as row ${first}). Import key is orderNumber + date.`
        );
        return { row, payload: null, laborData: [], materialData: [] };
      }
      seenKeys.set(key, input.rowNumber);
    }

    const emp = matchImportEmployee(input.laborName, ctx.employees);
    const { linked: materialData } = matchImportMaterials(input.materials, ctx.items, branch.id);
    const laborData: LaborInput[] = emp
      ? [
          {
            employeeId: emp.id,
            regularHours: input.laborHours,
            overtimeHours: input.laborOt,
          },
        ].filter((l) => l.regularHours > 0 || l.overtimeHours > 0)
      : [];

    const formValues = importRowToFormValues(input, {
      branchId: branch.id,
      laborEmployeeId: emp?.id ?? null,
      materials: materialData,
    });
    const validated = validateAndNormalize(formValues);
    if (!validated.ok) {
      const row = rejectRow(input, validated.error);
      return { row, payload: null, laborData: [], materialData: [] };
    }

    const existing = ctx.existingByKey.get(importIdentityKey(input.orderNumber, input.date));
    let action: ImportRowAction = existing ? "update" : "create";
    let message = existing ? "Would update existing job" : "Would create new job";
    if (existing && ctx.mode === "skip_existing") {
      action = "skip";
      message = "Would skip existing job";
    }

    const row: ParsedImportRow = {
      ...input,
      jobType: validated.data.jobType,
      mappedType: validated.data.jobType as JobType,
      status: "accept",
      rejectReason: null,
      action,
      message,
    };
    return { row, payload: validated.data, laborData, materialData };
  });
}

/**
 * All-or-nothing: any rejected row aborts the commit plan.
 * Accepted skip rows are included (no write) so counts stay accurate.
 */
export function planImportCommit(evaluated: EvaluatedImportRow[]): ImportCommitPlan {
  const rejected = evaluated
    .filter((e) => e.row.status === "reject")
    .map((e) => ({
      rowNumber: e.row.rowNumber,
      reason: e.row.rejectReason ?? e.row.message ?? "Rejected",
    }));
  if (rejected.length > 0) {
    return {
      ok: false,
      error: `Import has ${rejected.length} rejected row(s). Fix them and preview again. Nothing was written.`,
      rejected,
    };
  }
  if (evaluated.length === 0) {
    return { ok: false, error: "No rows to import.", rejected: [] };
  }

  const writes: ImportCommitWrite[] = [];
  for (const e of evaluated) {
    if (!e.payload) {
      return {
        ok: false,
        error: `Row ${e.row.rowNumber} passed preview without a validated payload.`,
        rejected: [{ rowNumber: e.row.rowNumber, reason: "Missing validated payload" }],
      };
    }
    const action = e.row.action === "skip" ? "skip" : e.row.action === "update" ? "update" : "create";
    writes.push({
      action,
      rowNumber: e.row.rowNumber,
      existingId: null,
      payload: e.payload,
      laborData: e.laborData,
      materialData: e.materialData,
    });
  }
  return { ok: true, writes };
}

/**
 * Apply planned writes in order. The caller must wrap this in one
 * `prisma.$transaction` (or a test stand-in). A thrown error aborts the batch.
 */
export async function commitImportWrites(
  writes: ImportCommitWrite[],
  writeRow: (write: ImportCommitWrite) => Promise<"created" | "updated" | "skipped">
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const write of writes) {
    const result = await writeRow(write);
    if (result === "created") created++;
    else if (result === "updated") updated++;
    else skipped++;
  }
  return { created, updated, skipped };
}

export { dateOnlyToUtc };
