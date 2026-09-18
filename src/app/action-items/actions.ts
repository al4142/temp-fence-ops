"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOnlyToUtc } from "@/lib/job-form";
import { applyComplete, applyReopen, parseActionItemInput } from "@/lib/action-items";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateActionItems() {
  revalidatePath("/action-items");
  revalidatePath("/");
}

export async function createActionItem(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = parseActionItemInput({
    date: String(formData.get("date") ?? ""),
    task: String(formData.get("task") ?? ""),
    assignedTo: String(formData.get("assignedTo") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.ok) return parsed;

  try {
    await prisma.actionItem.create({
      data: {
        date: dateOnlyToUtc(parsed.data.date),
        task: parsed.data.task,
        assignedTo: parsed.data.assignedTo,
        notes: parsed.data.notes,
        status: "Open",
        completedAt: null,
      },
    });
    revalidateActionItems();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create action item." };
  }
}

export async function updateActionItem(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };

  const parsed = parseActionItemInput({
    date: String(formData.get("date") ?? ""),
    task: String(formData.get("task") ?? ""),
    assignedTo: String(formData.get("assignedTo") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.ok) return parsed;

  try {
    await prisma.actionItem.update({
      where: { id },
      data: {
        date: dateOnlyToUtc(parsed.data.date),
        task: parsed.data.task,
        assignedTo: parsed.data.assignedTo,
        notes: parsed.data.notes,
      },
    });
    revalidateActionItems();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update action item." };
  }
}

export async function completeActionItem(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };
  try {
    await prisma.actionItem.update({
      where: { id },
      data: applyComplete(dateOnlyToUtc(new Date().toISOString().slice(0, 10))),
    });
    revalidateActionItems();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to complete." };
  }
}

export async function reopenActionItem(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };
  try {
    await prisma.actionItem.update({
      where: { id },
      data: applyReopen(),
    });
    revalidateActionItems();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reopen." };
  }
}

export async function deleteActionItem(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing id." };
  try {
    await prisma.actionItem.delete({ where: { id } });
    revalidateActionItems();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete." };
  }
}
