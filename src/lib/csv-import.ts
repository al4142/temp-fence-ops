import { parseCsv, rowToObject } from "./csv";
import { dateOnlyToUtc, parseOptionalNumber, parseRequiredNumber } from "./job-form";

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
  jobType: string;
  fenceType: string | null;
  qtyLf: number | null;
  screen: boolean;
  notes: string | null;
  accountExec: string | null;
  revenue: number;
  laborName: string | null;
  laborHours: number;
  laborOt: number;
  materials: Array<{ sku: string; quantity: number }>;
  action?: "create" | "update" | "skip" | "error";
  message?: string;
};

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
    const jobType = cell(cells, mapping.jobType).toUpperCase() || "OTHER";
    const customer = cell(cells, mapping.customer) || "TBD";

    const materials: Array<{ sku: string; quantity: number }> = [];
    for (const mc of materialColumns) {
      const qty = parseOptionalNumber(cell(cells, mc.index));
      if (qty !== null && qty !== 0) materials.push({ sku: mc.sku, quantity: qty });
    }

    const row: ParsedImportRow = {
      rowNumber,
      date: date ?? "",
      branchCode,
      class: cell(cells, mapping.class) || null,
      orderNumber,
      customer,
      address: cell(cells, mapping.address) || null,
      city: cell(cells, mapping.city) || null,
      jobType,
      fenceType: cell(cells, mapping.fenceType) || null,
      qtyLf: parseOptionalNumber(cell(cells, mapping.qtyLf)),
      screen: parseBool(cell(cells, mapping.screen)),
      notes: cell(cells, mapping.notes) || null,
      accountExec: cell(cells, mapping.accountExec) || null,
      revenue: parseRequiredNumber(cell(cells, mapping.revenue), 0),
      laborName: cell(cells, mapping.laborName) || null,
      laborHours: parseRequiredNumber(cell(cells, mapping.laborHours), 0),
      laborOt: parseRequiredNumber(cell(cells, mapping.laborOt), 0),
      materials,
    };

    if (!date) {
      row.action = "error";
      row.message = `Invalid or missing date (${dateRaw || "blank"})`;
    } else if (!orderNumber) {
      row.action = "error";
      row.message = "Missing order number";
    } else if (!branchCode) {
      row.action = "error";
      row.message = "Missing branch";
    }

    // Skip fully blank data rows
    const obj = rowToObject(headers, cells);
    if (Object.values(obj).every((v) => !v)) return;

    rows.push(row);
  });

  return { headers, mapping, materialColumns, unmapped, rows, parseErrors };
}

export { dateOnlyToUtc };
