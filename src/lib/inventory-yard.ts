/**
 * Server yard-bind for job-linked catalog lines.
 *
 * InventoryItem is unique per (branchId, sku). Existence-only checks (count of
 * IDs) accept Miami jobs that deduct Davie stock. Create/update job must reject
 * that. Same rule for material variances — they also move on-hand.
 */

export type YardBoundInventoryItem = {
  id: string;
  branchId: string;
  sku?: string | null;
  name?: string | null;
};

export type YardBindResult = { ok: true } | { ok: false; error: string };

export function collectLinkedInventoryItemIds(
  lines: { inventoryItemId: string | null | undefined }[]
): string[] {
  const ids: string[] = [];
  for (const line of lines) {
    const id = line.inventoryItemId?.trim();
    if (id) ids.push(id);
  }
  return ids;
}

/** Materials + variances — both write job-linked inventory IDs. */
export function collectJobInventoryItemIds(data: {
  materials: { inventoryItemId: string | null | undefined }[];
  variances: { inventoryItemId: string | null | undefined }[];
}): string[] {
  return [
    ...collectLinkedInventoryItemIds(data.materials),
    ...collectLinkedInventoryItemIds(data.variances),
  ];
}

function labelItem(item: YardBoundInventoryItem): string {
  const sku = item.sku?.trim();
  if (sku) return sku;
  const name = item.name?.trim();
  if (name) return name;
  return item.id;
}

function crossYardError(items: YardBoundInventoryItem[]): string {
  const labels = [...new Set(items.map(labelItem))];
  const listed = labels.join(", ");
  const verb = labels.length === 1 ? "belongs" : "belong";
  const noun = labels.length === 1 ? "Inventory item" : "Inventory items";
  return `${noun} ${listed} ${verb} to a different yard than this job. Use catalog stock from the job's yard.`;
}

/**
 * Fail closed: every requested catalog ID must exist and belong to the job yard.
 * Empty requested IDs (free-text / no catalog lines) are OK.
 */
export function validateInventoryItemsForJobYard(params: {
  requestedIds: string[];
  foundItems: YardBoundInventoryItem[];
  jobBranchId: string;
}): YardBindResult {
  const jobBranchId = params.jobBranchId.trim();
  const unique = [
    ...new Set(params.requestedIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (unique.length === 0) return { ok: true };

  if (!jobBranchId) {
    return { ok: false, error: "Branch is required." };
  }

  const foundById = new Map(params.foundItems.map((item) => [item.id, item]));
  const missing = unique.filter((id) => !foundById.has(id));
  if (missing.length > 0) {
    return { ok: false, error: "One or more inventory items were not found." };
  }

  const crossYard = unique
    .map((id) => foundById.get(id)!)
    .filter((item) => item.branchId !== jobBranchId);

  if (crossYard.length === 0) return { ok: true };
  return { ok: false, error: crossYardError(crossYard) };
}
