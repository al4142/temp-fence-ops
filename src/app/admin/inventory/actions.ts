"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOnlyToUtc } from "@/lib/job-form";
import {
  catalogUsageSnapshotFromRows,
  performCatalogHardDelete,
  planCatalogDelete,
  type CatalogNamedRef,
} from "@/lib/inventory-catalog";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type AdminActionResult =
  | { ok: true; deletedId?: string; deletedSku?: string }
  | { ok: false; error: string };

export type CatalogDeletePreviewResult =
  | { ok: false; error: string }
  | { ok: true; path: "unused"; id: string; sku: string; confirm: string }
  | {
      ok: true;
      path: "in-use";
      id: string;
      sku: string;
      title: string;
      body: string;
      primaryAction: "Deactivate";
      secondaryAction: "Cancel";
      refs: CatalogNamedRef[];
    };

async function loadCatalogUsage(itemId: string) {
  const [materials, variances, transferLines, writeOffs, adjustments] = await Promise.all([
    prisma.jobMaterial.findMany({
      where: { inventoryItemId: itemId },
      select: { job: { select: { orderNumber: true } } },
    }),
    prisma.jobMaterialVariance.findMany({
      where: { inventoryItemId: itemId },
      select: { job: { select: { orderNumber: true } } },
    }),
    prisma.transferLine.findMany({
      where: { OR: [{ fromInventoryItemId: itemId }, { toInventoryItemId: itemId }] },
      select: {
        transfer: {
          select: {
            date: true,
            fromBranch: { select: { code: true } },
            toBranch: { select: { code: true } },
          },
        },
      },
    }),
    prisma.writeOff.findMany({
      where: { inventoryItemId: itemId },
      select: { date: true, reason: true },
    }),
    prisma.inventoryAdjustment.findMany({
      where: { inventoryItemId: itemId },
      select: { adjustedAt: true, reason: true },
    }),
  ]);
  return catalogUsageSnapshotFromRows({
    materials: materials.map((row) => ({ orderNumber: row.job.orderNumber })),
    variances: variances.map((row) => ({ orderNumber: row.job.orderNumber })),
    transfers: transferLines.map((row) => ({
      fromCode: row.transfer.fromBranch.code,
      toCode: row.transfer.toBranch.code,
      date: ymd(row.transfer.date),
    })),
    writeOffs: writeOffs.map((row) => ({ date: ymd(row.date), reason: row.reason })),
    adjustments: adjustments.map((row) => ({
      date: ymd(row.adjustedAt),
      reason: row.reason,
    })),
  });
}

function revalidateCatalogPaths() {
  revalidatePath("/admin/inventory", "page");
  revalidatePath("/admin/inventory");
  revalidatePath("/inventory", "page");
  revalidatePath("/jobs");
  revalidatePath("/jobs/new");
}

function parseNonNeg(raw: FormDataEntryValue | null, label: string): number | { error: string } {
  const n = Number(String(raw ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return { error: `${label} must be a non-negative number.` };
  return n;
}

export async function createInventoryItem(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "ea").trim() || "ea";
  const branchId = String(formData.get("branchId") ?? "").trim();
  const reusable = String(formData.get("reusable") ?? "true") === "true";
  const startingQty = parseNonNeg(formData.get("startingQty"), "Starting qty");
  const unitCost = parseNonNeg(formData.get("unitCost"), "Unit cost");
  if (typeof startingQty === "object") return { ok: false, error: startingQty.error };
  if (typeof unitCost === "object") return { ok: false, error: unitCost.error };

  if (!sku) return { ok: false, error: "SKU is required." };
  if (!name) return { ok: false, error: "Name is required." };
  if (!branchId) return { ok: false, error: "Branch is required." };

  try {
    await prisma.inventoryItem.create({
      data: {
        sku,
        name,
        description: description || null,
        unit,
        branchId,
        reusable,
        startingQty,
        unitCost,
        active: true,
      },
    });
    revalidateCatalogPaths();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create item.";
    if (msg.includes("Unique") || msg.includes("UNIQUE")) {
      return { ok: false, error: `SKU "${sku}" already exists for this branch.` };
    }
    return { ok: false, error: msg };
  }
}

export async function updateInventoryItem(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "ea").trim() || "ea";
  const branchId = String(formData.get("branchId") ?? "").trim();
  const reusable = String(formData.get("reusable") ?? "true") === "true";
  const startingQty = parseNonNeg(formData.get("startingQty"), "Starting qty");
  const unitCost = parseNonNeg(formData.get("unitCost"), "Unit cost");
  if (typeof startingQty === "object") return { ok: false, error: startingQty.error };
  if (typeof unitCost === "object") return { ok: false, error: unitCost.error };

  if (!id) return { ok: false, error: "Missing item id." };
  if (!sku) return { ok: false, error: "SKU is required." };
  if (!name) return { ok: false, error: "Name is required." };
  if (!branchId) return { ok: false, error: "Branch is required." };

  try {
    await prisma.inventoryItem.update({
      where: { id },
      data: {
        sku,
        name,
        description: description || null,
        unit,
        branchId,
        reusable,
        startingQty,
        unitCost,
      },
    });
    revalidateCatalogPaths();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update item.";
    if (msg.includes("Unique") || msg.includes("UNIQUE")) {
      return { ok: false, error: `SKU "${sku}" already exists for this branch.` };
    }
    return { ok: false, error: msg };
  }
}

export async function previewCatalogDelete(itemId: string): Promise<CatalogDeletePreviewResult> {
  await requireSession();
  const id = itemId.trim();
  if (!id) return { ok: false, error: "Missing item id." };
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, sku: true },
    });
    if (!item) return { ok: false, error: "Inventory item not found." };
    const usage = await loadCatalogUsage(id);
    const plan = planCatalogDelete(item.sku, usage);
    if (plan.path === "unused") {
      return { ok: true, path: "unused", id: item.id, sku: item.sku, confirm: plan.confirm };
    }
    return {
      ok: true,
      path: "in-use",
      id: item.id,
      sku: item.sku,
      title: plan.dialog.title,
      body: plan.dialog.body,
      primaryAction: plan.dialog.primaryAction,
      secondaryAction: plan.dialog.secondaryAction,
      refs: usage.refs,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to check catalog usage." };
  }
}

/**
 * Hard-delete unused SKUs only. No interactive transaction (Neon pooler).
 * In-use SKUs keep history — the UI shows Deactivate instead of delete.
 */
export async function deleteInventoryItem(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing item id." };
  try {
    const outcome = await performCatalogHardDelete(
      {
        findItem: (itemId) =>
          prisma.inventoryItem.findUnique({
            where: { id: itemId },
            select: { id: true, sku: true },
          }),
        loadUsage: (itemId) => loadCatalogUsage(itemId),
        deleteItem: async (itemId) => {
          await prisma.inventoryItem.delete({ where: { id: itemId } });
        },
      },
      id
    );
    if (!outcome.ok) return outcome;
    revalidateCatalogPaths();
    return { ok: true, deletedId: id, deletedSku: outcome.sku };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete item.";
    if (msg.includes("Foreign key") || msg.includes("constraint") || msg.includes("P2003")) {
      try {
        const item = await prisma.inventoryItem.findUnique({
          where: { id },
          select: { sku: true },
        });
        const plan = planCatalogDelete(item?.sku ?? "SKU", await loadCatalogUsage(id));
        if (plan.path === "in-use") {
          return { ok: false, error: `${plan.dialog.title}. ${plan.dialog.body}` };
        }
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: msg };
  }
}

export async function deactivateInventoryItem(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing item id." };
  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return { ok: false, error: "Inventory item not found." };
    if (!item.active) return { ok: true };
    await prisma.inventoryItem.update({ where: { id }, data: { active: false } });
    revalidateCatalogPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to deactivate item." };
  }
}

export async function reactivateInventoryItem(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing item id." };
  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return { ok: false, error: "Inventory item not found." };
    if (item.active) return { ok: true };
    await prisma.inventoryItem.update({ where: { id }, data: { active: true } });
    revalidateCatalogPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reactivate item." };
  }
}

export async function createAdjustment(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const inventoryItemId = String(formData.get("inventoryItemId") ?? "").trim();
  const quantityDelta = Number(String(formData.get("quantityDelta") ?? "").replace(/,/g, ""));
  const reason = String(formData.get("reason") ?? "").trim();
  const dateStr = String(formData.get("adjustedAt") ?? "").trim();

  if (!inventoryItemId) return { ok: false, error: "Select an inventory item." };
  if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
    return { ok: false, error: "Qty delta must be a non-zero number." };
  }

  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) return { ok: false, error: "Inventory item not found." };

    await prisma.inventoryAdjustment.create({
      data: {
        inventoryItemId,
        branchId: item.branchId,
        quantityDelta,
        reason: reason || null,
        adjustedAt: dateStr ? dateOnlyToUtc(dateStr) : new Date(),
      },
    });
    revalidateCatalogPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save adjustment." };
  }
}
