import { Prisma } from "@prisma/client";

/** Job scalars that exist on the pre–plate-mount schema (no `postMount` / `fenceSections`). */
export const JOB_LEGACY_SELECT = {
  id: true,
  date: true,
  branchId: true,
  class: true,
  orderNumber: true,
  customer: true,
  address: true,
  city: true,
  jobType: true,
  fenceType: true,
  qtyLf: true,
  screen: true,
  screenSku: true,
  gates: true,
  gateType: true,
  gateQty: true,
  gateType2: true,
  gateQty2: true,
  topRail: true,
  bottomRail: true,
  weightMode: true,
  terminalsManual: true,
  notes: true,
  accountExec: true,
  revenue: true,
  lodging: true,
  freight: true,
  misc: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.JobSelect;

export const OPTIONAL_JOB_FIELDS = ["fenceSections", "postMount"] as const;

const OPTIONAL_FIELD_RE = /(?:Job\.)?(fenceSections|postMount)/i;

export function isMissingJobColumnError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2022") {
      const column = String((e.meta as { column?: unknown } | undefined)?.column ?? "");
      if (OPTIONAL_FIELD_RE.test(column) || OPTIONAL_FIELD_RE.test(e.message)) return true;
    }
  }
  const msg = e instanceof Error ? e.message : String(e);
  return (
    OPTIONAL_FIELD_RE.test(msg) &&
    /does not exist|P2022|42703|Unknown (?:column|arg|argument|field)/i.test(msg)
  );
}

export function stripOptionalJobFieldsFromData(data: unknown): unknown {
  if (data == null || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(stripOptionalJobFieldsFromData);
  const next = { ...(data as Record<string, unknown>) };
  for (const field of OPTIONAL_JOB_FIELDS) delete next[field];
  if (next.create) next.create = stripOptionalJobFieldsFromData(next.create);
  if (next.update) next.update = stripOptionalJobFieldsFromData(next.update);
  if (next.set && typeof next.set === "object" && !Array.isArray(next.set)) {
    next.set = stripOptionalJobFieldsFromData(next.set);
  }
  return next;
}

export function legacyJobReadArgs(args: Record<string, unknown>): Record<string, unknown> {
  const next = { ...args };
  if (next.select && typeof next.select === "object") {
    const select = { ...(next.select as Record<string, unknown>) };
    for (const field of OPTIONAL_JOB_FIELDS) delete select[field];
    next.select = select;
    return next;
  }
  if (next.include && typeof next.include === "object") {
    next.select = { ...JOB_LEGACY_SELECT, ...(next.include as Record<string, unknown>) };
    delete next.include;
    return next;
  }
  next.select = { ...JOB_LEGACY_SELECT };
  return next;
}

export const JOB_READ_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findUnique",
  "findFirstOrThrow",
  "findUniqueOrThrow",
]);

export const JOB_WRITE_OPERATIONS = new Set([
  "create",
  "update",
  "upsert",
  "createMany",
  "updateMany",
]);
