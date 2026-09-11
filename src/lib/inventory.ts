/**
 * Inventory movement rules derived from job.jobType.
 *
 * OUTBOUND (negative on-hand): INST, INSTALL, DELIVERY, DEL, DROP
 * INBOUND  (positive on-hand): PU, PICKUP, PICK-UP, RETURN, RET
 * Unknown / other types: zero effect (no inventory movement)
 */

const OUTBOUND = new Set([
  "INST",
  "INSTALL",
  "DELIVERY",
  "DEL",
  "DROP",
]);

const INBOUND = new Set([
  "PU",
  "PICKUP",
  "PICK-UP",
  "RETURN",
  "RET",
]);

export type InventoryDirection = -1 | 0 | 1;

export function inventorySignForJobType(jobType: string): InventoryDirection {
  const key = jobType.trim().toUpperCase();
  if (OUTBOUND.has(key)) return -1;
  if (INBOUND.has(key)) return 1;
  return 0;
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
  onHand: number;
  unitCost: number;
};

/**
 * onHand = startingQty + sum(job material qty * sign(jobType)) + sum(adjustments)
 * Only materials linked to an InventoryItem affect on-hand.
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
}): OnHandRow[] {
  const movement = new Map<string, number>();
  for (const m of params.materials) {
    if (!m.inventoryItemId) continue;
    const sign = inventorySignForJobType(m.job.jobType);
    if (sign === 0) continue;
    const prev = movement.get(m.inventoryItemId) ?? 0;
    movement.set(m.inventoryItemId, prev + sign * m.quantity);
  }

  const adj = new Map<string, number>();
  for (const a of params.adjustments) {
    adj.set(a.inventoryItemId, (adj.get(a.inventoryItemId) ?? 0) + a.quantityDelta);
  }

  return params.items.map((item) => {
    const movementQty = movement.get(item.id) ?? 0;
    const adjustmentQty = adj.get(item.id) ?? 0;
    const onHand = item.startingQty + movementQty + adjustmentQty;
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
      onHand,
      unitCost: item.unitCost,
    };
  });
}
