/**
 * Inventory movement rules derived from job.jobType + InventoryItem.reusable.
 *
 * Canonical labels (Title Case) only:
 *   OUTBOUND (negative on-hand): Install, Drop — all linked catalog lines
 *   INBOUND  (positive on-hand): Pickup — reusable items only
 *   No movement: Other, Site Walk (and any unrecognized string)
 *   Consumables (`reusable === false`) never restock on inbound jobs
 *
 * Also applied (not job analytics):
 * - Transfers: from yard -qty, to yard +qty
 * - Write-offs: -qty
 * - Job material variances: quantity is the inventory delta (+/-)
 */

import { normalizeJobType } from "./job-constants";

export type InventoryDirection = -1 | 0 | 1;

export function inventorySignForJobType(jobType: string): InventoryDirection {
  const key = normalizeJobType(jobType);
  if (key === "Install" || key === "Drop") return -1;
  if (key === "Pickup") return 1;
  return 0;
}

/**
 * Per-line inventory sign. Missing `reusable` follows the Prisma default (true).
 * Inbound jobs restock only when reusable is not explicitly false.
 */
export function inventorySignForMaterial(
  jobType: string,
  reusable: boolean = true
): InventoryDirection {
  const sign = inventorySignForJobType(jobType);
  if (sign > 0 && reusable === false) return 0;
  return sign;
}

export function describeInventoryEffect(jobType: string): string {
  const sign = inventorySignForJobType(jobType);
  if (sign < 0) return "Outbound (-)";
  if (sign > 0) return "Inbound (+)";
  return "No inventory effect";
}

export type OnHandRow = {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  startingQty: number;
  movementQty: number;
  adjustmentQty: number;
  transferQty: number;
  writeOffQty: number;
  varianceQty: number;
  onHand: number;
  unitCost: number;
};

/**
 * onHand = startingQty
 *   + sum(job material qty * sign(jobType, reusable))
 *   + sum(adjustments)
 *   + sum(transfer deltas)
 *   + sum(write-off deltas)   // always negative qty stored as -quantity
 *   + sum(job material variances)
 * Only materials/variances linked to an InventoryItem affect on-hand.
 * Pickup restocks reusable items only; consumables stay consumed.
 * Transfers and write-offs are excluded from job analytics.
 */
export function computeOnHand(params: {
  items: Array<{
    id: string;
    sku: string;
    name: string;
    unit: string;
    branchId: string;
    startingQty: number;
    unitCost: number;
    reusable?: boolean;
    branch: { code: string; name: string };
  }>;
  materials: Array<{
    inventoryItemId: string | null;
    quantity: number;
    job: { jobType: string; branchId: string };
  }>;
  adjustments: Array<{
    inventoryItemId: string;
    quantityDelta: number;
  }>;
  transferLines?: Array<{
    fromInventoryItemId: string;
    toInventoryItemId: string;
    quantity: number;
  }>;
  writeOffs?: Array<{
    inventoryItemId: string;
    quantity: number;
  }>;
  variances?: Array<{
    inventoryItemId: string | null;
    quantity: number;
  }>;
}): OnHandRow[] {
  const reusableById = new Map(
    params.items.map((item) => [item.id, item.reusable !== false])
  );

  const movement = new Map<string, number>();
  for (const m of params.materials) {
    if (!m.inventoryItemId) continue;
    const reusable = reusableById.get(m.inventoryItemId) ?? true;
    const sign = inventorySignForMaterial(m.job.jobType, reusable);
    if (sign === 0) continue;
    const prev = movement.get(m.inventoryItemId) ?? 0;
    movement.set(m.inventoryItemId, prev + sign * m.quantity);
  }

  const adj = new Map<string, number>();
  for (const a of params.adjustments) {
    adj.set(a.inventoryItemId, (adj.get(a.inventoryItemId) ?? 0) + a.quantityDelta);
  }

  const transfer = new Map<string, number>();
  for (const t of params.transferLines ?? []) {
    transfer.set(
      t.fromInventoryItemId,
      (transfer.get(t.fromInventoryItemId) ?? 0) - t.quantity
    );
    transfer.set(
      t.toInventoryItemId,
      (transfer.get(t.toInventoryItemId) ?? 0) + t.quantity
    );
  }

  const writeOff = new Map<string, number>();
  for (const w of params.writeOffs ?? []) {
    writeOff.set(
      w.inventoryItemId,
      (writeOff.get(w.inventoryItemId) ?? 0) - Math.abs(w.quantity)
    );
  }

  const variance = new Map<string, number>();
  for (const v of params.variances ?? []) {
    if (!v.inventoryItemId) continue;
    variance.set(
      v.inventoryItemId,
      (variance.get(v.inventoryItemId) ?? 0) + v.quantity
    );
  }

  return params.items.map((item) => {
    const movementQty = movement.get(item.id) ?? 0;
    const adjustmentQty = adj.get(item.id) ?? 0;
    const transferQty = transfer.get(item.id) ?? 0;
    const writeOffQty = writeOff.get(item.id) ?? 0;
    const varianceQty = variance.get(item.id) ?? 0;
    const onHand =
      item.startingQty +
      movementQty +
      adjustmentQty +
      transferQty +
      writeOffQty +
      varianceQty;
    return {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      branchId: item.branchId,
      branchCode: item.branch.code,
      branchName: item.branch.name,
      startingQty: item.startingQty,
      movementQty,
      adjustmentQty,
      transferQty,
      writeOffQty,
      varianceQty,
      onHand,
      unitCost: item.unitCost,
    };
  });
}
