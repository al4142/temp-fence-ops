"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOnlyToUtc } from "@/lib/job-form";
import { WRITEOFF_REASONS } from "@/lib/ops-constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

const known = new Set<string>(WRITEOFF_REASONS as unknown as string[]);

export async function createWriteOff(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const date = String(formData.get("date") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "").trim();
  const inventoryItemId = String(formData.get("inventoryItemId") ?? "").trim();
  const quantity = Number(String(formData.get("quantity") ?? "").replace(/,/g, ""));
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!date) return { ok: false, error: "Date is required." };
  if (!branchId) return { ok: false, error: "Yard is required." };
  if (!inventoryItemId) return { ok: false, error: "Item is required." };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be a positive number." };
  }
  if (!known.has(reason)) return { ok: false, error: "Invalid reason." };

  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) return { ok: false, error: "Inventory item not found." };
    if (item.branchId !== branchId) {
      return { ok: false, error: "Item does not belong to the selected yard." };
    }
    await prisma.writeOff.create({
      data: {
        date: dateOnlyToUtc(date),
        branchId,
        inventoryItemId,
        quantity,
        reason,
        notes,
      },
    });
    revalidatePath("/write-offs");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create write-off." };
  }
}

export async function deleteWriteOff(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };
  try {
    await prisma.writeOff.delete({ where: { id } });
    revalidatePath("/write-offs");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete." };
  }
}
