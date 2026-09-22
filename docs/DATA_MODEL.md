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
- `active` - soft-deactivate in-use SKUs; hard-delete only when nothing references the row. Inactive SKUs stay on historical jobs but cannot be newly attached.

### Job
One daily ticket. Multiple jobs can share an `orderNumber` (install then pickup).
Key fields: `date`, `branchId`, `class`, `orderNumber`, `customer`, site fields, `jobType`,
fence specs, `revenue`, optional `contact1` / `contact2`. `lodging` / `freight` / `misc` are **denormalized sums** of their line tables.

- `jobType` — Title Case only: **Install**, **Pickup**, **Drop**, **Other**, **Site Walk**, **Relocate** (`JOB_TYPES` in `src/lib/job-constants.ts`).
- `status` — Title Case **Active** | **Cancelled** (`JOB_STATUSES`), same pattern as `jobType`. Prisma `@default("Active")`. Blank / missing treated as Active. Create always inserts Active (no picker). Edit may set Cancelled. Cancelled stays on Jobs / the day list; inventory sign is 0 regardless of `jobType`; P&L and analytics exclude the ticket. Materials / labor / cost lines / variances are kept (not wiped). Setting status back to Active restores that type’s inventory sign and P&L inclusion.
- `class` — optional string. Install / Pickup / Drop / Other / Relocate: **EVENT**, **CONSTRUCTION**, **OTHER** (`JOB_CLASSES`). Site Walk: **Non Pay**, **Site Visit** (`SITE_WALK_CLASSES`). The form swaps the dropdown when type changes; class is **not** a Jobs-table column. Import stores the CSV cell as-is (no class alias map). Create default class is shared with Install (not a Relocate-only default).
- `contact1` / `contact2` — optional free text (`String?`, SQL `TEXT`, nullable). Each is a site contact (name and phone in one string). Blank on the form stores NULL. Independent of `notes`: clearing a contact does not change notes. Create and edit persist both. Migration `prisma/migrations/20260922101500_job_contacts`. CSV import does not map these columns.
- Site Walk and Relocate may omit fence type, LF, and materials (`allowsEmptyFenceAndMaterials`). **Site Walk only** may keep a 0/0 hour labor row for attribution (`allowsZeroHourLabor`). Relocate keeps `JOB_CLASSES` (not Non Pay / Site Visit) and drops 0/0 labor rows — hours are billable. Install / Pickup / Drop / Other keep today’s required-line rules (unnamed material rows with a non-zero qty still error; 0/0 labor rows are dropped).

BOM generator inputs (optional; used by **Generate BOM** on create/edit):
- `fenceSections` (JSON) — one or more sections. Each has `fenceType`, `qtyLf`, rails/weights as applicable, `postMount` (chainlink only), per-section gates, `terminalsManual`
- Legacy columns (`fenceType`, `qtyLf`, `topRail`, `bottomRail`, `weightMode`, `postMount`, gates, `terminalsManual`) stay as **denormalized** totals / first-section values. Jobs with `fenceSections = null` map to one driven section from those columns
- `screenSku` is job-level (rolls from the sum of section LF). `screen` stays in sync as `Boolean(screenSku)`

Live recipes: [BOM_APPROVED.md](./BOM_APPROVED.md). Calculator: `src/lib/bom/`.
Install vs Pickup does **not** change BOM quantities (inventory sign is separate; **Cancelled** still forces sign 0).

### Job cost lines
- `JobLodgingLine` - amount, hotel/facility, notes
- `JobFreightLine` - company, cost, notes
- `JobMiscLine` - amount, category/description, notes (job-tied fuel/PPE/etc.)

### JobMaterial (line items)
Prefer `inventoryItemId` for catalog items (drives inventory + P&L cost), or `itemName` free-text.

### JobMaterialVariance
Job-tied inventory delta (`quantity` signed): damaged on site / lost / extra used / returned unused.
Moves on-hand unless the job is **Cancelled**; P&L treats `-qty * unitCost` as variance cost (Cancelled tickets excluded from P&L).

### JobLabor
`regularHours` + `overtimeHours` against an `Employee`. Cost = `reg * rate + ot * rate * 1.5`.
Site Walk may store a 0/0 hour row for attribution (P&L labor stays $0). **0-hr labor is Site Walk only** — Relocate and other types drop 0/0 rows. Relocate hours that are present count on P&L like Install.

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
       + sum (JobMaterial.quantity x sign(job.jobType, item.reusable, job.status))   // linked items only; Cancelled = 0
       + sum InventoryAdjustment.quantityDelta
       + sum TransferLine (-from / +to)
       + sum WriteOff (-quantity)
       + sum JobMaterialVariance.quantity                 // signed delta; skipped when job.status is Cancelled
```

| jobType (normalized) | Sign | Meaning |
|----------------------|------|---------|
| Install | -1 | Leave yard / install on site |
| Drop | -1 | Outbound delivery / drop |
| Pickup | +1 if `reusable`, else 0 | Return to yard (consumables stay consumed) |
| Other | 0 | No inventory effect |
| Site Walk | 0 | Non-pay / site visit — no inventory effect |
| Relocate | 0 | Move a section — no inventory effect (Jobs Inv. wording); no new materials |
| unrecognized | 0 | No inventory effect |
| **Cancelled** (any type) | 0 | No inventory effect — materials/variances retained |

Pickup inbound applies only when `InventoryItem.reusable` is true. Consumables
(`reusable: false`, e.g. `SCREW-BOLT+ 3/8x3`, aluminum ties, zip ties) still
decrement on Install/Drop and do **not** restock on Pickup.

Canonical Title Case labels: Install, Pickup, Drop, Other, Site Walk, Relocate. Implementation: `src/lib/inventory.ts`
(`inventorySignForMaterial`). **Cancelled** jobs use sign 0 regardless of type; setting status back to Active restores the type sign.

## P&L derivation (by order number)

Cancelled tickets are **excluded** from every component (revenue, labor, materials, lodging/freight/misc, variance). Order rollup `jobCount` is Active tickets only. An order whose tickets are all Cancelled has no P&L (`buildOrderPnL` returns null). Active Install / Pickup / Drop / Other / Site Walk / Relocate formulas below are otherwise unchanged. Relocate revenue and labor are included; Relocate is not a material-cost job.

| Component | Formula |
|-----------|---------|
| Revenue | sum job.revenue |
| Labor cost | sum (regxrate + otxratex1.5) |
| Material cost | sum (qty × inventoryItem.unitCost) on **outbound** jobs only (Install / Drop); Pickup / Other / Site Walk / Relocate excluded so Pickup BOM is not a second cost; free-text → 0 |
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
