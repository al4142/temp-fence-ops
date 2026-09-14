"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import {
  type ActionResult,
  type JobFormValues,
  dateOnlyToUtc,
  validateAndNormalize,
} from "@/lib/job-form";

async function assertBranchExists(branchId: string) {
  const b = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!b) throw new Error("Branch not found.");
}

async function assertEmployeesExist(ids: string[]) {
  if (ids.length === 0) return;
  const count = await prisma.employee.count({ where: { id: { in: ids } } });
  if (count !== new Set(ids).size) throw new Error("One or more employees were not found.");
}

async function assertInventoryItemsExist(ids: string[]) {
  if (ids.length === 0) return;
  const unique = [...new Set(ids)];
  const count = await prisma.inventoryItem.count({ where: { id: { in: unique } } });
  if (count !== unique.length) throw new Error("One or more inventory items were not found.");
}

function isNextRedirect(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function collectItemIds(data: {
  materials: { inventoryItemId: string | null }[];
  variances: { inventoryItemId: string | null }[];
}) {
  return [
    ...data.materials.map((m) => m.inventoryItemId).filter((id): id is string => Boolean(id)),
    ...data.variances.map((v) => v.inventoryItemId).filter((id): id is string => Boolean(id)),
  ];
}

export async function createJob(values: JobFormValues): Promise<ActionResult> {
  await requireSession();
  const parsed = validateAndNormalize(values);
  if (!parsed.ok) return parsed;
  const data = parsed.data;

  try {
    await assertBranchExists(data.branchId);
    await assertEmployeesExist(data.labor.map((l) => l.employeeId));
    await assertInventoryItemsExist(collectItemIds(data));

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          date: dateOnlyToUtc(data.date),
          branchId: data.branchId,
          class: data.class,
          orderNumber: data.orderNumber,
          customer: data.customer,
          address: data.address,
          city: data.city,
          jobType: data.jobType,
          fenceType: data.fenceType,
          qtyLf: data.qtyLf,
          screen: data.screen,
          gates: data.gates,
          notes: data.notes,
          accountExec: data.accountExec,
          revenue: data.revenue,
          lodging: data.lodging,
          freight: data.freight,
          misc: data.misc,
        },
      });

      if (data.materials.length > 0) {
        await tx.jobMaterial.createMany({
          data: data.materials.map((m) => ({
            jobId: created.id,
            inventoryItemId: m.inventoryItemId,
            itemName: m.itemName,
            quantity: m.quantity,
            notes: m.notes,
          })),
        });
      }

      if (data.labor.length > 0) {
        await tx.jobLabor.createMany({
          data: data.labor.map((l) => ({
            jobId: created.id,
            employeeId: l.employeeId,
            regularHours: l.regularHours,
            overtimeHours: l.overtimeHours,
          })),
        });
      }

      if (data.lodgingLines.length > 0) {
        await tx.jobLodgingLine.createMany({
          data: data.lodgingLines.map((l) => ({
            jobId: created.id,
            amount: l.amount,
            facility: l.facility,
            notes: l.notes,
          })),
        });
      }

      if (data.freightLines.length > 0) {
        await tx.jobFreightLine.createMany({
          data: data.freightLines.map((l) => ({
            jobId: created.id,
            company: l.company,
            cost: l.cost,
            notes: l.notes,
          })),
        });
      }

      if (data.miscLines.length > 0) {
        await tx.jobMiscLine.createMany({
          data: data.miscLines.map((l) => ({
            jobId: created.id,
            amount: l.amount,
            category: l.category,
            notes: l.notes,
          })),
        });
      }

      if (data.variances.length > 0) {
        await tx.jobMaterialVariance.createMany({
          data: data.variances.map((v) => ({
            jobId: created.id,
            inventoryItemId: v.inventoryItemId,
            itemName: v.itemName,
            quantity: v.quantity,
            reason: v.reason,
            notes: v.notes,
          })),
        });
      }

      return created;
    });

    revalidatePath("/jobs");
    revalidatePath("/");
    revalidatePath("/inventory");
    revalidatePath("/pnl");
    redirect(`/jobs/${job.id}`);
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    const message = e instanceof Error ? e.message : "Failed to create job.";
    return { ok: false, error: message };
  }
}

export async function updateJob(
  jobId: string,
  values: JobFormValues
): Promise<ActionResult> {
  await requireSession();
  const parsed = validateAndNormalize(values);
  if (!parsed.ok) return parsed;
  const data = parsed.data;

  try {
    const existing = await prisma.job.findUnique({ where: { id: jobId } });
    if (!existing) return { ok: false, error: "Job not found." };

    await assertBranchExists(data.branchId);
    await assertEmployeesExist(data.labor.map((l) => l.employeeId));
    await assertInventoryItemsExist(collectItemIds(data));

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: {
          date: dateOnlyToUtc(data.date),
          branchId: data.branchId,
          class: data.class,
          orderNumber: data.orderNumber,
          customer: data.customer,
          address: data.address,
          city: data.city,
          jobType: data.jobType,
          fenceType: data.fenceType,
          qtyLf: data.qtyLf,
          screen: data.screen,
          gates: data.gates,
          notes: data.notes,
          accountExec: data.accountExec,
          revenue: data.revenue,
          lodging: data.lodging,
          freight: data.freight,
          misc: data.misc,
        },
      });

      await tx.jobMaterial.deleteMany({ where: { jobId } });
      await tx.jobLabor.deleteMany({ where: { jobId } });
      await tx.jobLodgingLine.deleteMany({ where: { jobId } });
      await tx.jobFreightLine.deleteMany({ where: { jobId } });
      await tx.jobMiscLine.deleteMany({ where: { jobId } });
      await tx.jobMaterialVariance.deleteMany({ where: { jobId } });

      if (data.materials.length > 0) {
        await tx.jobMaterial.createMany({
          data: data.materials.map((m) => ({
            jobId,
            inventoryItemId: m.inventoryItemId,
            itemName: m.itemName,
            quantity: m.quantity,
            notes: m.notes,
          })),
        });
      }

      if (data.labor.length > 0) {
        await tx.jobLabor.createMany({
          data: data.labor.map((l) => ({
            jobId,
            employeeId: l.employeeId,
            regularHours: l.regularHours,
            overtimeHours: l.overtimeHours,
          })),
        });
      }

      if (data.lodgingLines.length > 0) {
        await tx.jobLodgingLine.createMany({
          data: data.lodgingLines.map((l) => ({
            jobId,
            amount: l.amount,
            facility: l.facility,
            notes: l.notes,
          })),
        });
      }

      if (data.freightLines.length > 0) {
        await tx.jobFreightLine.createMany({
          data: data.freightLines.map((l) => ({
            jobId,
            company: l.company,
            cost: l.cost,
            notes: l.notes,
          })),
        });
      }

      if (data.miscLines.length > 0) {
        await tx.jobMiscLine.createMany({
          data: data.miscLines.map((l) => ({
            jobId,
            amount: l.amount,
            category: l.category,
            notes: l.notes,
          })),
        });
      }

      if (data.variances.length > 0) {
        await tx.jobMaterialVariance.createMany({
          data: data.variances.map((v) => ({
            jobId,
            inventoryItemId: v.inventoryItemId,
            itemName: v.itemName,
            quantity: v.quantity,
            reason: v.reason,
            notes: v.notes,
          })),
        });
      }
    });

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/");
    revalidatePath("/inventory");
    revalidatePath("/pnl");
    redirect(`/jobs/${jobId}`);
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    const message = e instanceof Error ? e.message : "Failed to update job.";
    return { ok: false, error: message };
  }
}

export async function deleteJob(jobId: string): Promise<ActionResult> {
  await requireSession();
  try {
    const existing = await prisma.job.findUnique({ where: { id: jobId } });
    if (!existing) return { ok: false, error: "Job not found." };

    await prisma.job.delete({ where: { id: jobId } });

    revalidatePath("/jobs");
    revalidatePath("/");
    revalidatePath("/inventory");
    revalidatePath("/pnl");
    redirect("/jobs");
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    const message = e instanceof Error ? e.message : "Failed to delete job.";
    return { ok: false, error: message };
  }
}
