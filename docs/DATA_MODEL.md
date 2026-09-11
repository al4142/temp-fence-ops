# Data model

ER-style overview of the Temp Fence Ops schema (Prisma / SQLite demo).

## Entities

```
Branch 1--* Employee
Branch 1--* InventoryItem
Branch 1--* Job
Branch 1--* InventoryAdjustment

Job 1--* JobMaterial
Job 1--* JobLabor

InventoryItem 1--* JobMaterial   (optional; free-text itemName allowed)
InventoryItem 1--* InventoryAdjustment
Employee 1--* JobLabor
```

### Branch
Yard / operating location. `code` (e.g. `MIA`, `DAV`) is unique.

### Employee
Office-safe fields only for the public demo: `name`, `nameKey`, `hourlyRate`, `position`, `branchId`.
No SSN, DOB, address, phone, or personal email.

### InventoryItem
Catalog row **per branch** (`@@unique([branchId, sku])`).
- `startingQty` — opening balance for the demo / period
- `unitCost` — used for P&L material cost (not sell price)
- `reusable` — fence panels/bases typically true; consumables may be false

### Job
One daily ticket. Multiple jobs can share an `orderNumber` (install then pickup).
Key fields: `date`, `branchId`, `class` (EVENT / CONSTRUCTION), `orderNumber`, `customer`,
site fields, `jobType`, fence specs, `revenue`, `lodging`, `freight`, `misc`.

### JobMaterial (line items)
Not wide columns. Each row is a quantity of one item:
- Prefer `inventoryItemId` for catalog items (drives inventory + P&L cost)
- Or `itemName` free-text for one-offs / consumables (no inventory effect; $0 material cost)

### JobLabor
`regularHours` + `overtimeHours` against an `Employee`. Cost =
`reg * rate + ot * rate * 1.5` (demo convention).

### InventoryAdjustment
Manual corrections (damage, count, transfer). `quantityDelta` positive adds to on-hand.

## Inventory movement rules

On-hand for an inventory item:

```
onHand = startingQty
       + SUM (JobMaterial.quantity * sign(job.jobType))   // linked items only
       + SUM InventoryAdjustment.quantityDelta
```

| jobType (normalized) | Sign | Meaning |
|----------------------|------|---------|
| INST, INSTALL | -1 | Leave yard / install on site |
| DELIVERY, DEL, DROP | -1 | Outbound delivery |
| PU, PICKUP, PICK-UP, RETURN, RET | +1 | Return to yard |
| Anything else | 0 | No inventory effect |

Implementation: `src/lib/inventory.ts`.

## P&L derivation (by order number)

Aggregate all `Job` rows with the same `orderNumber`:

| Component | Formula |
|-----------|---------|
| Revenue | SUM job.revenue |
| Labor cost | SUM (reg*rate + ot*rate*1.5) |
| Material cost | SUM (qty * inventoryItem.unitCost); free-text -> 0 |
| Lodging / Freight / Misc | SUM respective job fields |
| Total cost | labor + materials + lodging + freight + misc |
| Gross profit | revenue - total cost |

See `src/lib/pnl.ts` and the `/pnl` page.

## SQLite vs PostgreSQL

Demo `datasource` uses `provider = "sqlite"`. For company deploy, switch to `postgresql`
and set `DATABASE_URL` (see `.env.example`). Schema types are portable; re-run migrate.

## Auth users

| Model | Purpose |
|-------|---------|
| User | Office login (`email`, bcrypt `passwordHash`, `name`, `role`). Demo seed only for public repo. |
