"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

function revalidateVendorPaths() {
  revalidatePath("/admin/vendors");
  revalidatePath("/expenses");
}

export async function createVendor(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };
  try {
    await prisma.vendor.create({
      data: { name, notes: notes || null, active: true },
    });
    revalidateVendorPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create vendor." };
  }
}

export async function updateVendor(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const active = String(formData.get("active") ?? "true") === "true";
  if (!id) return { ok: false, error: "Missing vendor id." };
  if (!name) return { ok: false, error: "Name is required." };
  try {
    await prisma.vendor.update({
      where: { id },
      data: { name, notes: notes || null, active },
    });
    revalidateVendorPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update vendor." };
  }
}

export async function deactivateVendor(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing vendor id." };
  try {
    await prisma.vendor.update({ where: { id }, data: { active: false } });
    revalidateVendorPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to deactivate." };
  }
}

export async function reactivateVendor(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing vendor id." };
  try {
    await prisma.vendor.update({ where: { id }, data: { active: true } });
    revalidateVendorPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reactivate." };
  }
}
