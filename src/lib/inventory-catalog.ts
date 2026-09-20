/**
 * Safe catalog delete / deactivate (ALE-29).
 *
 * Hard-delete only when nothing references the SKU. In-use items stay in the
 * catalog (`active: false`) so job materials, variances, transfers, write-offs,
 * and adjustments keep their history and display name.
 */

export type CatalogUsageCounts = {
  materials: number;
  variances: number;
  transfersFrom: number;
  transfersTo: number;
  writeOffs: number;
  adjustments: number;
};

export type CatalogAttachItem = {
  id: string;
  sku?: string | null;
  name?: string | null;
  active: boolean;
};

export type CatalogGuardResult = { ok: true } | { ok: false; error: string };

export function emptyCatalogUsage(): CatalogUsageCounts {
  return {
    materials: 0,
    variances: 0,
    transfersFrom: 0,
    transfersTo: 0,
    writeOffs: 0,
    adjustments: 0,
  };
}

export function catalogTransferCount(counts: CatalogUsageCounts): number {
  return counts.transfersFrom + counts.transfersTo;
}

export function catalogUsageTotal(counts: CatalogUsageCounts): number {
  return (
    counts.materials +
    counts.variances +
    catalogTransferCount(counts) +
    counts.writeOffs +
    counts.adjustments
  );
}

export function catalogIsInUse(counts: CatalogUsageCounts): boolean {
  return catalogUsageTotal(counts) > 0;
}

export function describeCatalogUsage(counts: CatalogUsageCounts): string {
  const transfers = catalogTransferCount(counts);
  const parts: string[] = [];
  if (counts.materials) parts.push(`${counts.materials} job material(s)`);
  if (counts.variances) parts.push(`${counts.variances} job variance(s)`);
  if (transfers) parts.push(`${transfers} transfer line(s)`);
  if (counts.writeOffs) parts.push(`${counts.writeOffs} write-off(s)`);
  if (counts.adjustments) parts.push(`${counts.adjustments} adjustment(s)`);
  return parts.join(", ");
}

export function hardDeleteBlockedMessage(params: {
  sku: string;
  counts: CatalogUsageCounts;
}): string {
  const usage = describeCatalogUsage(params.counts) || "existing history";
  return `Cannot delete "${params.sku}": still referenced by ${usage}. Deactivate the SKU instead so job history stays linked.`;
}

function labelItem(item: CatalogAttachItem): string {
  const sku = item.sku?.trim();
  if (sku) return sku;
  const name = item.name?.trim();
  if (name) return name;
  return item.id;
}

/**
 * Inactive SKUs cannot be newly attached to jobs. IDs already on the job
 * (historical materials/variances) may remain so edits do not strip names.
 */
export function validateCatalogItemsForJobAttach(params: {
  requestedIds: string[];
  foundItems: CatalogAttachItem[];
  alreadyAttachedIds?: string[];
}): CatalogGuardResult {
  const unique = [
    ...new Set(params.requestedIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (unique.length === 0) return { ok: true };

  const foundById = new Map(params.foundItems.map((item) => [item.id, item]));
  const missing = unique.filter((id) => !foundById.has(id));
  if (missing.length > 0) {
    return { ok: false, error: "One or more inventory items were not found." };
  }

  const already = new Set(
    (params.alreadyAttachedIds ?? []).map((id) => id.trim()).filter(Boolean)
  );
  const newlyInactive = unique
    .map((id) => foundById.get(id)!)
    .filter((item) => !item.active && !already.has(item.id));

  if (newlyInactive.length === 0) return { ok: true };

  const labels = [...new Set(newlyInactive.map(labelItem))];
  const listed = labels.join(", ");
  const noun = labels.length === 1 ? "Inactive catalog SKU" : "Inactive catalog SKUs";
  return {
    ok: false,
    error: `${noun} ${listed} cannot be attached to jobs. Deactivated items stay on historical jobs; pick an active SKU or reactivate this one.`,
  };
}

/** Job / export display: catalog name wins so deactivate does not orphan labels. */
export function catalogLineDisplayName(line: {
  itemName?: string | null;
  inventoryItem?: { name: string } | null;
}): string {
  return line.inventoryItem?.name ?? line.itemName ?? "(unnamed)";
}

export function catalogItemsForJobPicker<T extends { id: string; active?: boolean }>(
  items: T[],
  alreadyAttachedIds: string[] = []
): T[] {
  const keep = new Set(alreadyAttachedIds.filter(Boolean));
  return items.filter((item) => item.active !== false || keep.has(item.id));
}
