"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import {
  parseImportText,
  evaluateImportRows,
  planImportCommit,
  commitImportWrites,
  summarizeImportPreview,
  importIdentityKey,
  dateOnlyToUtc,
  type ImportCommitMode,
  type ImportCommitWrite,
  type ImportLookupContext,
  type ImportPreviewSummary,
  type ParsedImportRow,
} from "@/lib/csv-import";

/**
 * Preview payload for Dutch’s import UI.
 *
 * Each `rows[]` item includes:
 * - originalType: raw CSV job-type cell
 * - mappedType: Install | Pickup | Drop | Other | null
 * - status: accept | reject
 * - rejectReason: string | null
 * - action: create | update | skip | error (commit intent once accepted)
 *
 * `summary` is accept/reject + create/update/skip counts.
 */
export type ImportPreviewResult =
  | {
      ok: true;
      headers: string[];
      mapping: Record<string, number | undefined>;
      materialColumns: Array<{ header: string; sku: string }>;
      unmapped: string[];
      parseErrors: string[];
      rows: ParsedImportRow[];
      summary: ImportPreviewSummary;
      note: string;
    }
  | { ok: false; error: string };

export type ImportCommitResult =
  | {
      ok: true;
      created: number;
      updated: number;
      skipped: number;
      errors: Array<{ rowNumber: number; message: string }>;
      materialsNote: string;
    }
  | { ok: false; error: string };

async function readCsvFromForm(formData: FormData): Promise<string | null> {
  const file = formData.get("file");
  if (file && typeof file === "object" && "text" in file) {
    const text = await (file as File).text();
    return text;
  }
  const pasted = String(formData.get("csvText") ?? "");
  return pasted.trim() ? pasted : null;
}

function commitMode(formData: FormData): ImportCommitMode {
  return String(formData.get("mode") ?? "upsert") === "skip_existing"
    ? "skip_existing"
    : "upsert";
}

async function loadImportContext(mode: ImportCommitMode): Promise<ImportLookupContext> {
  const [branches, employees, items] = await Promise.all([
    prisma.branch.findMany(),
    prisma.employee.findMany({ where: { active: true } }),
    prisma.inventoryItem.findMany({
      select: { id: true, sku: true, branchId: true, active: true },
    }),
  ]);

  return {
    branchesByCode: new Map(branches.map((b) => [b.code.toUpperCase(), b])),
    existingByKey: new Map(),
    employees,
    items,
    mode,
  };
}

async function attachExistingJobs(
  ctx: ImportLookupContext,
  rows: ParsedImportRow[]
): Promise<ImportLookupContext> {
  const keys = rows
    .filter((r) => r.status === "accept" && r.orderNumber && r.date)
    .map((r) => ({ orderNumber: r.orderNumber, date: dateOnlyToUtc(r.date), key: importIdentityKey(r.orderNumber, r.date) }));
  if (keys.length === 0) return ctx;

  const existing = await prisma.job.findMany({
    where: {
      OR: keys.map((k) => ({ orderNumber: k.orderNumber, date: k.date })),
    },
    select: { id: true, orderNumber: true, date: true },
  });
  const existingByKey = new Map(ctx.existingByKey);
  for (const job of existing) {
    const date = job.date.toISOString().slice(0, 10);
    existingByKey.set(importIdentityKey(job.orderNumber, date), { id: job.id });
  }
  return { ...ctx, existingByKey };
}

const PREVIEW_NOTE =
  "Job types: known Daily Tracker aliases (INST, PU, DELIVERY, …) map to Install / Pickup / Drop / Other. Unknown codes reject the row — they are never coerced to Other. Commit is one transaction (all accepted rows, or nothing). Materials: SKU-named columns link when they match the branch catalog; otherwise they are left for follow-up.";

export async function previewCsvImport(formData: FormData): Promise<ImportPreviewResult> {
  await requireSession();
  const text = await readCsvFromForm(formData);
  if (!text) return { ok: false, error: "Upload a CSV file or paste CSV text." };

  const parsed = parseImportText(text);
  const ctx = await attachExistingJobs(await loadImportContext(commitMode(formData)), parsed.rows);
  const evaluated = evaluateImportRows(parsed.rows, ctx);
  const rows = evaluated.map((e) => e.row);

  return {
    ok: true,
    headers: parsed.headers,
    mapping: parsed.mapping as Record<string, number | undefined>,
    materialColumns: parsed.materialColumns.map((m) => ({
      header: m.header,
      sku: m.sku,
    })),
    unmapped: parsed.unmapped,
    parseErrors: parsed.parseErrors,
    rows,
    summary: summarizeImportPreview(rows),
    note: PREVIEW_NOTE,
  };
}

function jobFieldsFromPayload(payload: ImportCommitWrite["payload"]) {
  return {
    date: dateOnlyToUtc(payload.date),
    branchId: payload.branchId,
    class: payload.class,
    orderNumber: payload.orderNumber,
    customer: payload.customer,
    address: payload.address,
    city: payload.city,
    jobType: payload.jobType,
    fenceType: payload.fenceType,
    qtyLf: payload.qtyLf,
    screen: payload.screen,
    screenSku: payload.screenSku,
    gates: payload.gates,
    gateType: payload.gateType,
    gateQty: payload.gateQty,
    gateType2: payload.gateType2,
    gateQty2: payload.gateQty2,
    topRail: payload.topRail,
    bottomRail: payload.bottomRail,
    weightMode: payload.weightMode,
    postMount: payload.postMount,
    terminalsManual: payload.terminalsManual,
    fenceSections: payload.fenceSections as Prisma.InputJsonValue,
    notes: payload.notes,
    accountExec: payload.accountExec,
    revenue: payload.revenue,
  };
}

export async function commitCsvImport(formData: FormData): Promise<ImportCommitResult> {
  await requireSession();
  const text = await readCsvFromForm(formData);
  if (!text) return { ok: false, error: "Upload a CSV file or paste CSV text." };

  const mode = commitMode(formData);
  const parsed = parseImportText(text);
  if (parsed.parseErrors.length > 0 && parsed.rows.length === 0) {
    return { ok: false, error: parsed.parseErrors.join("; ") };
  }

  const ctx = await attachExistingJobs(await loadImportContext(mode), parsed.rows);
  const evaluated = evaluateImportRows(parsed.rows, ctx);
  const plan = planImportCommit(evaluated);
  if (!plan.ok) {
    return { ok: false, error: plan.error };
  }

  let materialsLinked = 0;
  let materialsSkipped = 0;
  for (const e of evaluated) {
    materialsLinked += e.materialData.length;
    materialsSkipped += Math.max(0, e.row.materials.length - e.materialData.length);
  }

  try {
    const counts = await prisma.$transaction(
      (tx) =>
        commitImportWrites(plan.writes, async (write) => {
          if (write.action === "skip") return "skipped";

          const existing = await tx.job.findFirst({
            where: {
              orderNumber: write.payload.orderNumber,
              date: dateOnlyToUtc(write.payload.date),
            },
            select: { id: true },
          });

          if (existing && mode === "skip_existing") return "skipped";

          const jobFields = jobFieldsFromPayload(write.payload);

          if (existing) {
            await tx.job.update({ where: { id: existing.id }, data: jobFields });
            if (write.laborData.length > 0) {
              await tx.jobLabor.deleteMany({ where: { jobId: existing.id } });
              await tx.jobLabor.createMany({
                data: write.laborData.map((l) => ({ jobId: existing.id, ...l })),
              });
            }
            if (write.materialData.length > 0) {
              await tx.jobMaterial.deleteMany({ where: { jobId: existing.id } });
              await tx.jobMaterial.createMany({
                data: write.materialData.map((m) => ({ jobId: existing.id, ...m })),
              });
            }
            return "updated";
          }

          const job = await tx.job.create({ data: jobFields });
          if (write.laborData.length > 0) {
            await tx.jobLabor.createMany({
              data: write.laborData.map((l) => ({ jobId: job.id, ...l })),
            });
          }
          if (write.materialData.length > 0) {
            await tx.jobMaterial.createMany({
              data: write.materialData.map((m) => ({ jobId: job.id, ...m })),
            });
          }
          return "created";
        }),
      { timeout: 60_000, maxWait: 10_000 }
    );

    revalidatePath("/jobs");
    revalidatePath("/");
    revalidatePath("/inventory");
    revalidatePath("/pnl");
    revalidatePath("/analytics");

    return {
      ok: true,
      created: counts.created,
      updated: counts.updated,
      skipped: counts.skipped,
      errors: [],
      materialsNote: `Material columns: ${materialsLinked} linked to catalog; ${materialsSkipped} SKUs not found for branch (left for follow-up). Wide Excel material grids are not fully supported in v1.`,
    };
  } catch (e) {
    return {
      ok: false,
      error: `Import rolled back (nothing was written): ${
        e instanceof Error ? e.message : "Write failed"
      }`,
    };
  }
}
