"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

function slugifyNameKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createEmployee(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  let nameKey = String(formData.get("nameKey") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "").trim();
  const hourlyRate = Number(String(formData.get("hourlyRate") ?? "").replace(/,/g, ""));

  if (!name) return { ok: false, error: "Name is required." };
  if (!branchId) return { ok: false, error: "Branch is required." };
  if (!position) return { ok: false, error: "Position is required." };
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return { ok: false, error: "Hourly rate must be a non-negative number." };
  }
  if (!nameKey) nameKey = slugifyNameKey(name);
  if (!nameKey) return { ok: false, error: "nameKey could not be derived from name." };

  try {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) return { ok: false, error: "Branch not found." };

    await prisma.employee.create({
      data: {
        name,
        nameKey,
        position,
        branchId,
        hourlyRate,
        active: true,
      },
    });
    revalidatePath("/admin/employees");
    revalidatePath("/jobs");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create employee.";
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      return { ok: false, error: `nameKey "${nameKey}" is already in use.` };
    }
    return { ok: false, error: msg };
  }
}

export async function updateEmployee(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  let nameKey = String(formData.get("nameKey") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "").trim();
  const hourlyRate = Number(String(formData.get("hourlyRate") ?? "").replace(/,/g, ""));
  const active = String(formData.get("active") ?? "true") === "true";

  if (!id) return { ok: false, error: "Missing employee id." };
  if (!name) return { ok: false, error: "Name is required." };
  if (!branchId) return { ok: false, error: "Branch is required." };
  if (!position) return { ok: false, error: "Position is required." };
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return { ok: false, error: "Hourly rate must be a non-negative number." };
  }
  if (!nameKey) nameKey = slugifyNameKey(name);

  try {
    await prisma.employee.update({
      where: { id },
      data: { name, nameKey, position, branchId, hourlyRate, active },
    });
    revalidatePath("/admin/employees");
    revalidatePath("/jobs");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update employee.";
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      return { ok: false, error: `nameKey "${nameKey}" is already in use.` };
    }
    return { ok: false, error: msg };
  }
}

export async function deactivateEmployee(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing employee id." };
  try {
    await prisma.employee.update({ where: { id }, data: { active: false } });
    revalidatePath("/admin/employees");
    revalidatePath("/jobs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to deactivate." };
  }
}

export async function reactivateEmployee(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing employee id." };
  try {
    await prisma.employee.update({ where: { id }, data: { active: true } });
    revalidatePath("/admin/employees");
    revalidatePath("/jobs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reactivate." };
  }
}
