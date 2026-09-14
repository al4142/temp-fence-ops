"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOnlyToUtc } from "@/lib/job-form";
import { YARD_EXPENSE_CATEGORIES } from "@/lib/ops-constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

const knownCats = new Set<string>(YARD_EXPENSE_CATEGORIES as unknown as string[]);

export async function createYardExpense(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const date = String(formData.get("date") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const vendorId = String(formData.get("vendorId") ?? "").trim() || null;
  const vendorText = String(formData.get("vendorText") ?? "").trim() || null;
  const amount = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const purchasedBy =
    String(formData.get("purchasedBy") ?? "").trim() || session.name;

  if (!date) return { ok: false, error: "Date is required." };
  if (!branchId) return { ok: false, error: "Yard is required." };
  if (!knownCats.has(category)) return { ok: false, error: "Invalid category." };
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Amount must be a non-negative number." };
  }

  try {
    await prisma.yardExpense.create({
      data: {
        date: dateOnlyToUtc(date),
        branchId,
        category,
        vendorId,
        vendorText: vendorId ? null : vendorText,
        amount,
        purchasedBy,
        notes,
      },
    });
    revalidatePath("/expenses");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save expense." };
  }
}

export async function deleteYardExpense(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };
  try {
    await prisma.yardExpense.delete({ where: { id } });
    revalidatePath("/expenses");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete." };
  }
}
