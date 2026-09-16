import { BOM_NAME_ALIASES } from "./catalog";
import type { BomLine, CatalogItem, MatchedBomMaterial } from "./types";

export function normalizeCatalogKey(s: string): string {
  return s
    .toUpperCase()
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function aliasKeys(canonical: string): string[] {
  const keys = [normalizeCatalogKey(canonical)];
  for (const extra of BOM_NAME_ALIASES[canonical] ?? []) {
    keys.push(normalizeCatalogKey(extra));
  }
  // Also: if canonical is an alias of something, include the canonical's own aliases only.
  return keys;
}

export function matchCatalogItem(
  skuOrName: string,
  catalog: CatalogItem[]
): CatalogItem | null {
  const want = new Set(aliasKeys(skuOrName));
  // If skuOrName is itself listed as an alias, also match the canonical key.
  for (const [canonical, aliases] of Object.entries(BOM_NAME_ALIASES)) {
    if (aliases.some((a) => normalizeCatalogKey(a) === normalizeCatalogKey(skuOrName))) {
      want.add(normalizeCatalogKey(canonical));
      for (const a of aliases) want.add(normalizeCatalogKey(a));
    }
  }

  for (const item of catalog) {
    const sku = normalizeCatalogKey(item.sku);
    const name = normalizeCatalogKey(item.name);
    if (want.has(sku) || want.has(name)) return item;
  }
  return null;
}

export function bomLinesToMaterials(
  lines: BomLine[],
  catalog: CatalogItem[]
): MatchedBomMaterial[] {
  return lines.map((line) => {
    const match = matchCatalogItem(line.skuOrName, catalog);
    const extra = match
      ? null
      : "No catalog match — entered as free-text.";
    const notes = [line.notes, extra].filter(Boolean).join(" ") || null;
    return {
      inventoryItemId: match?.id ?? null,
      itemName: match ? null : line.skuOrName,
      quantity: line.qty,
      notes,
      catalogMatched: Boolean(match),
      skuOrName: line.skuOrName,
    };
  });
}
