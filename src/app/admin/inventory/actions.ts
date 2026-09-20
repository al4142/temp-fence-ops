"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOnlyToUtc } from "@/lib/job-form";
import { catalogIsInUse, hardDeleteBlockedMessage } from "@/lib/inventory-catalog";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

function revalidateCatalogPaths() {
  revalidatePath("/admin/inventory");
  revalidatePath("/inventory");
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

/**
 * Hard-delete only when unused. In-use SKUs keep history — deactivate instead.
 * Adjustments are usage, not leftover rows to wipe.
 */
export async function deleteInventoryItem(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing item id." };
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) return { ok: false as const, error: "Inventory item not found." };
      const [materials, variances, transfersFrom, transfersTo, writeOffs, adjustments] =
        await Promise.all([
          tx.jobMaterial.count({ where: { inventoryItemId: id } }),
          tx.jobMaterialVariance.count({ where: { inventoryItemId: id } }),
          tx.transferLine.count({ where: { fromInventoryItemId: id } }),
          tx.transferLine.count({ where: { toInventoryItemId: id } }),
          tx.writeOff.count({ where: { inventoryItemId: id } }),
          tx.inventoryAdjustment.count({ where: { inventoryItemId: id } }),
        ]);
      const usage = {
        materials,
        variances,
        transfersFrom,
        transfersTo,
        writeOffs,
        adjustments,
      };
      if (catalogIsInUse(usage)) {
        return {
          ok: false as const,
          error: hardDeleteBlockedMessage({ sku: item.sku, counts: usage }),
        };
      }
      await tx.inventoryItem.delete({ where: { id } });
      return { ok: true as const };
    });
    if (!outcome.ok) return outcome;
    revalidateCatalogPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete item." };
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
