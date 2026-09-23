-- ALE-30 added 12x6 SLIDE and 24x6 SLIDE to the demo seed after yards were
-- already populated (and Davie copies only SKUs it already has). Without these
-- rows, Generate BOM leaves the gate leaf as free-text and inventory does not move.
-- On-hand starts at 0. Do not copy the demo seed startingQty onto live yards.

INSERT INTO "InventoryItem" (
  "id",
  "sku",
  "name",
  "description",
  "unit",
  "reusable",
  "branchId",
  "startingQty",
  "unitCost",
  "active",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  v.sku,
  v.name,
  v.description,
  'ea',
  true,
  b.id,
  0,
  v.unit_cost,
  true,
  NOW(),
  NOW()
FROM "Branch" b
CROSS JOIN (
  VALUES
    ('12x6-SLIDE', '12x6 SLIDE', 'Demo BOM catalog — 12x6 SLIDE', 220::double precision),
    ('24x6-SLIDE', '24x6 SLIDE', 'Demo BOM catalog — 24x6 SLIDE', 320::double precision)
) AS v(sku, name, description, unit_cost)
WHERE NOT EXISTS (
  SELECT 1
  FROM "InventoryItem" i
  WHERE i."branchId" = b.id
    AND upper(i.sku) = upper(v.sku)
);
