"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

export type RemoveBranchResult =
  | { ok: true; mode: "deleted" }
  | { ok: true; mode: "deactivated"; message: string }
  | { ok: false; error: string };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function revalidateBranchPaths() {
  revalidatePath("/admin/branches");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/inventory");
  revalidatePath("/jobs");
  revalidatePath("/jobs/new");
  revalidatePath("/inventory");
  revalidatePath("/analytics");
  revalidatePath("/");
}

export async function createBranch(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const name = String(formData.get("name") ?? "").trim();

  if (!code) return { ok: false, error: "Code is required (e.g. DAV, MIA)." };
  if (!/^[A-Z0-9_-]{2,12}$/.test(code)) {
    return {
      ok: false,
      error: "Code must be 2-12 characters: letters, numbers, underscore, or hyphen.",
    };
  }
  if (!name) return { ok: false, error: "Name is required (e.g. Davie Yard)." };

  try {
    await prisma.branch.create({
      data: { code, name, active: true },
    });
    revalidateBranchPaths();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create branch.";
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      return { ok: false, error: `Code "${code}" is already in use.` };
    }
    return { ok: false, error: msg };
  }
}

export async function updateBranch(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const active = String(formData.get("active") ?? "true") === "true";

  if (!id) return { ok: false, error: "Missing branch id." };
  if (!code) return { ok: false, error: "Code is required (e.g. DAV, MIA)." };
  if (!/^[A-Z0-9_-]{2,12}$/.test(code)) {
    return {
      ok: false,
      error: "Code must be 2-12 characters: letters, numbers, underscore, or hyphen.",
    };
  }
  if (!name) return { ok: false, error: "Name is required (e.g. Davie Yard)." };

  try {
    await prisma.branch.update({
      where: { id },
      data: { code, name, active },
    });
    revalidateBranchPaths();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update branch.";
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      return { ok: false, error: `Code "${code}" is already in use.` };
    }
    return { ok: false, error: msg };
  }
}

export async function deactivateBranch(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing branch id." };
  try {
    await prisma.branch.update({ where: { id }, data: { active: false } });
    revalidateBranchPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to deactivate." };
  }
}

export async function reactivateBranch(formData: FormData): Promise<AdminActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing branch id." };
  try {
    await prisma.branch.update({ where: { id }, data: { active: true } });
    revalidateBranchPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reactivate." };
  }
}

/** Hard-delete when unused; otherwise soft-deactivate and explain why. */
export async function removeBranch(formData: FormData): Promise<RemoveBranchResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing branch id." };

  try {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            jobs: true,
            employees: true,
            inventoryItems: true,
            adjustments: true,
          },
        },
      },
    });
    if (!branch) return { ok: false, error: "Branch not found." };

    const { jobs, employees, inventoryItems, adjustments } = branch._count;
    const inUse = jobs + employees + inventoryItems + adjustments > 0;

    if (inUse) {
      const usage = `${jobs} job(s), ${employees} employee(s), ${inventoryItems} inventory item(s), ${adjustments} adjustment(s)`;
      if (!branch.active) {
        return {
          ok: false,
          error: `Cannot delete "${branch.code}" - still referenced by ${usage}. It is already inactive.`,
        };
      }
      await prisma.branch.update({ where: { id }, data: { active: false } });
      revalidateBranchPaths();
      return {
        ok: true,
        mode: "deactivated",
        message: `Cannot delete "${branch.code}" - still in use (${usage}). Deactivated instead so history stays linked.`,
      };
    }

    await prisma.branch.delete({ where: { id } });
    revalidateBranchPaths();
    return { ok: true, mode: "deleted" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to remove branch." };
  }
}
