# Build plan

Phased replacement of the Excel workbook (Daily Tracker, Inventory by branch, P&L by order #,
Construction rollups, Master installer table).

## Phase 0 - Scaffold + schema + seed

- Next.js App Router, TypeScript, Tailwind, Prisma
- SQLite demo database
- Models: Branch, Employee, InventoryItem, Job, JobMaterial, JobLabor, InventoryAdjustment
- Seed with fake Miami / Davie-style data (install vs pickup inventory impact)
- Docs: DATA_MODEL, BUILD_PLAN, README

## Phase 1 - Daily jobs CRUD + line items

- Jobs list + job detail (materials & labor)
- Create / edit / delete job forms (`/jobs/new`, `/jobs/[id]/edit`)
- Dynamic material lines (catalog pick by branch, or free-text)
- Dynamic labor lines (employee pick, regular + OT hours)
- Transactional upsert: job + replace JobMaterial / JobLabor
- Validation: order #, date, branch, jobType; sensible number parsing
- Inventory effect displayed from jobType

## Phase 2 - Inventory by branch  (computed view)

- On-hand = startingQty + signed job movements + adjustments
- Filter by branch
- Later: adjustment UI, low-stock alerts, transfers between branches

## Phase 3 - Job P&L by order #  (lookup)

- Lookup page aggregating jobs by order number
- Labor + material + lodging/freight/misc
- Later: export CSV, compare estimate vs actual

## Phase 4 - Construction / analytics dashboards

- Construction class rollups (LF installed, open sites, utilization)
- Revenue by branch / class / account exec
- Crew hours trends
- Event vs construction mix

## Phase 5 - Auth + private company deploy

- Auth for 1-2 office users (e.g. NextAuth / simple credentials)
- Private repo or private deploy; PostgreSQL via `DATABASE_URL`
- Optional tablet/phone polish for field viewing
- Strip or gate demo seed; import real workbook history carefully (no PII leakage)

## Notes

- Desktop-first UI; tables should remain usable on tablet.
- Public repo must keep **fake sample data only**.
