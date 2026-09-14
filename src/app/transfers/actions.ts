"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOnlyToUtc } from "@/lib/job-form";

export type ActionResult = { ok: true } | { ok: false; error: string };

type LineIn = { fromInventoryItemId: string; quantity: number; notes?: string | null };

async function resolveToItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  fromItemId: string,
  toBranchId: string
) {
  const from = await tx.inventoryItem.findUnique({ where: { id: fromItemId } });
  if (!from) throw new Error("Source inventory item not found.");
  if (from.branchId === toBranchId) {
    throw new Error("Cannot transfer an item within the same yard.");
  }
  let to = await tx.inventoryItem.findUnique({
    where: { branchId_sku: { branchId: toBranchId, sku: from.sku } },
  });
  if (!to) {
    to = await tx.inventoryItem.create({
      data: {
        sku: from.sku,
        name: from.name,
        description: from.description,
        unit: from.unit,
        reusable: from.reusable,
        branchId: toBranchId,
        startingQty: 0,
        unitCost: from.unitCost,
      },
    });
  }
  return { from, to };
}

export async function createTransfer(input: {
  date: string;
  fromBranchId: string;
  toBranchId: string;
  notes: string;
  lines: LineIn[];
}): Promise<ActionResult> {
  await requireSession();
  const date = input.date.trim();
  const fromBranchId = input.fromBranchId.trim();
  const toBranchId = input.toBranchId.trim();
  if (!date) return { ok: false, error: "Date is required." };
  if (!fromBranchId || !toBranchId) {
    return { ok: false, error: "From and to yards are required." };
  }
  if (fromBranchId === toBranchId) {
    return { ok: false, error: "From and to yards must differ." };
  }
  const lines = (input.lines ?? []).filter((l) => l.fromInventoryItemId && l.quantity > 0);
  if (lines.length === 0) return { ok: false, error: "Add at least one line with qty > 0." };

  try {
    await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          date: dateOnlyToUtc(date),
          fromBranchId,
          toBranchId,
          notes: input.notes.trim() || null,
        },
      });
      for (const line of lines) {
        const { from, to } = await resolveToItem(tx, line.fromInventoryItemId, toBranchId);
        if (from.branchId !== fromBranchId) {
          throw new Error(`Item ${from.sku} is not on the from yard.`);
        }
        await tx.transferLine.create({
          data: {
            transferId: transfer.id,
            fromInventoryItemId: from.id,
            toInventoryItemId: to.id,
            quantity: line.quantity,
            notes: line.notes?.trim() || null,
          },
        });
      }
    });
    revalidatePath("/transfers");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create transfer." };
  }
}

export async function deleteTransfer(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };
  try {
    await prisma.transfer.delete({ where: { id } });
    revalidatePath("/transfers");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete." };
  }
}
