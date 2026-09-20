# Data model

ER-style overview of the Temp Fence Ops schema (Prisma / PostgreSQL).

## Entities

```
Branch 1--* Employee
Branch 1--* InventoryItem
Branch 1--* Job
Branch 1--* InventoryAdjustment
Branch 1--* YardExpense
Branch 1--* WriteOff
Branch 1--* Transfer (from / to)

Vendor 1--* YardExpense

Job 1--* JobMaterial
Job 1--* JobLabor
Job 1--* JobLodgingLine
Job 1--* JobFreightLine
Job 1--* JobMiscLine
Job 1--* JobMaterialVariance

Transfer 1--* TransferLine
InventoryItem 1--* JobMaterial / WriteOff / TransferLine / JobMaterialVariance / InventoryAdjustment
Employee 1--* JobLabor
```

### Branch
Yard / operating location. `code` (e.g. `MIA`, `DAV`) is unique.

### Employee
Office-safe fields only for the public demo: `name`, `nameKey`, `hourlyRate`, `position`, `branchId`.
No SSN, DOB, address, phone, or personal email.

### InventoryItem
Catalog row **per branch** (`@@unique([branchId, sku])`).
- `startingQty` - opening balance for the demo / period
- `unitCost` - used for P&L material cost (not sell price); Wave 3 will refine avg / landed cost
- `reusable` - fence panels/bases typically true; consumables may be false

### Job
One daily ticket. Multiple jobs can share an `orderNumber` (install then pickup).
Key fields: `date`, `branchId`, `class`, `orderNumber`, `customer`, site fields, `jobType`,
fence specs, `revenue`. `lodging` / `freight` / `misc` are **denormalized sums** of their line tables.

BOM generator inputs (optional; used by **Generate BOM** on create/edit):
- `fenceSections` (JSON) — one or more sections. Each has `fenceType`, `qtyLf`, rails/weights as applicable, `postMount` (chainlink only), per-section gates, `terminalsManual`
- Legacy columns (`fenceType`, `qtyLf`, `topRail`, `bottomRail`, `weightMode`, `postMount`, gates, `terminalsManual`) stay as **denormalized** totals / first-section values. Jobs with `fenceSections = null` map to one driven section from those columns
- `screenSku` is job-level (rolls from the sum of section LF). `screen` stays in sync as `Boolean(screenSku)`

Live recipes: [BOM_APPROVED.md](./BOM_APPROVED.md). Calculator: `src/lib/bom/`.
Install vs Pickup does **not** change BOM quantities (inventory sign is separate).

### Job cost lines
- `JobLodgingLine` - amount, hotel/facility, notes
- `JobFreightLine` - company, cost, notes
- `JobMiscLine` - amount, category/description, notes (job-tied fuel/PPE/etc.)

### JobMaterial (line items)
Prefer `inventoryItemId` for catalog items (drives inventory + P&L cost), or `itemName` free-text.

### JobMaterialVariance
Job-tied inventory delta (`quantity` signed): damaged on site / lost / extra used / returned unused.
Moves on-hand; P&L treats `-qty * unitCost` as variance cost.

### JobLabor
`regularHours` + `overtimeHours` against an `Employee`. Cost = `reg * rate + ot * rate * 1.5`.

### Vendor
Admin CRUD: name, optional notes, active. Used on yard expenses; future purchases.

### YardExpense
Yard ledger (not forced onto jobs): date, yard, category (PPE/Consumables/Tools/Food/Equipment/Other),
optional vendor, amount, purchased by, notes.

### Transfer / TransferLine
From yard -> to yard. Lines reference from/to inventory items (destination SKU created if missing).
Excluded from job analytics. Carry cost conceptual until Wave 3.

### WriteOff
Yard, item, qty, reason (damaged/scrap/shrink), date, notes. Qty down. Excluded from job analytics.

### InventoryAdjustment
Manual corrections. `quantityDelta` positive adds to on-hand.

## Inventory movement rules

```
onHand = startingQty
       + sum (JobMaterial.quantity x sign(job.jobType, item.reusable))   // linked items only
       + sum InventoryAdjustment.quantityDelta
       + sum TransferLine (-from / +to)
       + sum WriteOff (-quantity)
       + sum JobMaterialVariance.quantity                 // signed delta
```

| jobType (normalized) | Sign | Meaning |
|----------------------|------|---------|
| Install | -1 | Leave yard / install on site |
| Drop | -1 | Outbound delivery / drop |
| Pickup | +1 if `reusable`, else 0 | Return to yard (consumables stay consumed) |
| Other (and unrecognized) | 0 | No inventory effect |

Pickup inbound applies only when `InventoryItem.reusable` is true. Consumables
(`reusable: false`, e.g. `SCREW-BOLT+ 3/8x3`, aluminum ties, zip ties) still
decrement on Install/Drop and do **not** restock on Pickup.

Only these four Title Case labels are recognized. Implementation: `src/lib/inventory.ts`
(`inventorySignForMaterial`).

## P&L derivation (by order number)

| Component | Formula |
|-----------|---------|
| Revenue | sum job.revenue |
| Labor cost | sum (regxrate + otxratex1.5) |
| Material cost | sum (qty x inventoryItem.unitCost); free-text -> 0 |
| Lodging / Freight / Misc | sum cost line amounts (fallback: denormalized job fields) |
| Material variance | sum (-variance.qty x unitCost) |
| Total cost | labor + materials + lodging + freight + misc + variance |
| Gross profit | revenue - total cost |

Transfers, write-offs, and yard expenses are **not** in job P&L / analytics.

## PostgreSQL

`datasource` uses `provider = "postgresql"`. Local (Docker or a Neon branch) and
demo/production (Neon) share the same provider. Set `DATABASE_URL` (see `.env.example`).
Apply schema with `npx prisma migrate deploy` on a fresh Postgres database.

## Auth users

| Model | Purpose |
|-------|---------|
| User | Office login (`email`, bcrypt `passwordHash`, `name`, `role`). Demo seed only for public repo. |
