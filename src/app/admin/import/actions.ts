"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import {
  parseImportText,
  dateOnlyToUtc,
  type ParsedImportRow,
} from "@/lib/csv-import";

export type ImportPreviewResult = {
  ok: true;
  headers: string[];
  mapping: Record<string, number | undefined>;
  materialColumns: Array<{ header: string; sku: string }>;
  unmapped: string[];
  parseErrors: string[];
  rows: ParsedImportRow[];
  note: string;
} | { ok: false; error: string };

export type ImportCommitResult = {
  ok: true;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ rowNumber: number; message: string }>;
  materialsNote: string;
} | { ok: false; error: string };

async function readCsvFromForm(formData: FormData): Promise<string | null> {
  const file = formData.get("file");
  if (file && typeof file === "object" && "text" in file) {
    const text = await (file as File).text();
    return text;
  }
  const pasted = String(formData.get("csvText") ?? "");
  return pasted.trim() ? pasted : null;
}

export async function previewCsvImport(formData: FormData): Promise<ImportPreviewResult> {
  await requireSession();
  const text = await readCsvFromForm(formData);
  if (!text) return { ok: false, error: "Upload a CSV file or paste CSV text." };

  const parsed = parseImportText(text);
  const branches = await prisma.branch.findMany();
  const branchByCode = new Map(branches.map((b) => [b.code.toUpperCase(), b]));

  // Annotate create/update/skip vs existing jobs (orderNumber + date)
  for (const row of parsed.rows) {
    if (row.action === "error") continue;
    if (!branchByCode.has(row.branchCode)) {
      row.action = "error";
      row.message = `Unknown branch code "${row.branchCode}"`;
      continue;
    }
    const existing = await prisma.job.findFirst({
      where: {
        orderNumber: row.orderNumber,
        date: dateOnlyToUtc(row.date),
      },
      select: { id: true },
    });
    row.action = existing ? "update" : "create";
    row.message = existing ? "Would update existing job" : "Would create new job";
  }

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
    rows: parsed.rows,
    note:
      "Materials: wide Excel material columns are hard - v1 imports core job fields; SKU-named columns are linked when they match the branch catalog, otherwise materials are left empty for follow-up.",
  };
}

export async function commitCsvImport(formData: FormData): Promise<ImportCommitResult> {
  await requireSession();
  const text = await readCsvFromForm(formData);
  if (!text) return { ok: false, error: "Upload a CSV file or paste CSV text." };

  const mode = String(formData.get("mode") ?? "upsert"); // upsert | skip_existing
  const parsed = parseImportText(text);
  if (parsed.parseErrors.length > 0 && parsed.rows.length === 0) {
    return { ok: false, error: parsed.parseErrors.join("; ") };
  }

  const branches = await prisma.branch.findMany();
  const branchByCode = new Map(branches.map((b) => [b.code.toUpperCase(), b]));
  const employees = await prisma.employee.findMany({ where: { active: true } });
  const items = await prisma.inventoryItem.findMany();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ rowNumber: number; message: string }> = [];
  let materialsLinked = 0;
  let materialsSkipped = 0;

  for (const row of parsed.rows) {
    if (row.action === "error" || !row.date || !row.orderNumber || !row.branchCode) {
      errors.push({
        rowNumber: row.rowNumber,
        message: row.message ?? "Invalid row",
      });
      continue;
    }

    const branch = branchByCode.get(row.branchCode);
    if (!branch) {
      errors.push({ rowNumber: row.rowNumber, message: `Unknown branch "${row.branchCode}"` });
      continue;
    }

    const date = dateOnlyToUtc(row.date);
    const existing = await prisma.job.findFirst({
      where: { orderNumber: row.orderNumber, date },
    });

    if (existing && mode === "skip_existing") {
      skipped++;
      continue;
    }

    // Resolve optional labor
    const laborData: Array<{
      employeeId: string;
      regularHours: number;
      overtimeHours: number;
    }> = [];
    if (row.laborName && (row.laborHours > 0 || row.laborOt > 0)) {
      const key = row.laborName.trim().toLowerCase();
      const emp =
        employees.find((e) => e.nameKey === key.replace(/\s+/g, "-")) ||
        employees.find((e) => e.name.toLowerCase() === key);
      if (emp) {
        laborData.push({
          employeeId: emp.id,
          regularHours: row.laborHours,
          overtimeHours: row.laborOt,
        });
      }
    }

    // Resolve optional material columns by SKU for this branch
    const materialData: Array<{
      inventoryItemId: string | null;
      itemName: string | null;
      quantity: number;
      notes: string | null;
    }> = [];
    for (const m of row.materials) {
      const item = items.find(
        (i) => i.branchId === branch.id && i.sku.toUpperCase() === m.sku.toUpperCase()
      );
      if (item) {
        materialData.push({
          inventoryItemId: item.id,
          itemName: null,
          quantity: m.quantity,
          notes: null,
        });
        materialsLinked++;
      } else {
        materialsSkipped++;
      }
    }

    const jobFields = {
      date,
      branchId: branch.id,
      class: row.class,
      orderNumber: row.orderNumber,
      customer: row.customer,
      address: row.address,
      city: row.city,
      jobType: row.jobType,
      fenceType: row.fenceType,
      qtyLf: row.qtyLf,
      screen: row.screen,
      notes: row.notes,
      accountExec: row.accountExec,
      revenue: row.revenue,
    };

    try {
      if (existing) {
        await prisma.$transaction(async (tx) => {
          await tx.job.update({ where: { id: existing.id }, data: jobFields });
          // Only replace labor/materials if import provided some
          if (laborData.length > 0) {
            await tx.jobLabor.deleteMany({ where: { jobId: existing.id } });
            await tx.jobLabor.createMany({
              data: laborData.map((l) => ({ jobId: existing.id, ...l })),
            });
          }
          if (materialData.length > 0) {
            await tx.jobMaterial.deleteMany({ where: { jobId: existing.id } });
            await tx.jobMaterial.createMany({
              data: materialData.map((m) => ({ jobId: existing.id, ...m })),
            });
          }
        });
        updated++;
      } else {
        await prisma.$transaction(async (tx) => {
          const job = await tx.job.create({ data: jobFields });
          if (laborData.length > 0) {
            await tx.jobLabor.createMany({
              data: laborData.map((l) => ({ jobId: job.id, ...l })),
            });
          }
          if (materialData.length > 0) {
            await tx.jobMaterial.createMany({
              data: materialData.map((m) => ({ jobId: job.id, ...m })),
            });
          }
        });
        created++;
      }
    } catch (e) {
      errors.push({
        rowNumber: row.rowNumber,
        message: e instanceof Error ? e.message : "Write failed",
      });
    }
  }

  revalidatePath("/jobs");
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/pnl");
  revalidatePath("/analytics");

  return {
    ok: true,
    created,
    updated,
    skipped,
    errors,
    materialsNote: `Material columns: ${materialsLinked} linked to catalog; ${materialsSkipped} SKUs not found for branch (left for follow-up). Wide Excel material grids are not fully supported in v1.`,
  };
}
