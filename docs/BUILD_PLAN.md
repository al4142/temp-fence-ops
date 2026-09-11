# Build plan

Phased replacement of the Excel workbook (Daily Tracker, Inventory by branch, P&L by order #,
Construction rollups, Master installer table).

## Phase 0 - Scaffold + schema + seed

- Next.js App Router, TypeScript, Tailwind, Prisma
- SQLite demo database
- Models: Branch, Employee, InventoryItem, Job, JobMaterial, JobLabor, InventoryAdjustment
- Seed with fake Miami / Davie-style data (install vs pickup inventory impact)
- Docs: DATA_MODEL, BUILD_PLAN, README

**Status: done**

## Phase 1 - Daily jobs CRUD + line items

- Jobs list + job detail (materials & labor)
- Create / edit / delete job forms (`/jobs/new`, `/jobs/[id]/edit`)
- Dynamic material lines (catalog pick by branch, or free-text)
- Dynamic labor lines (employee pick, regular + OT hours)
- Transactional upsert: job + replace JobMaterial / JobLabor
- Validation: order #, date, branch, jobType; sensible number parsing
- Inventory effect displayed from jobType

**Status: done**

## Phase 2 - Inventory by branch  (computed view)

- On-hand = startingQty + signed job movements + adjustments
- Filter by branch
- Later: adjustment UI, low-stock alerts, transfers between branches

**Status: done** (computed view + branch filter; adjustment UI still later)

## Phase 3 - Job P&L by order #  (lookup)

- Lookup page aggregating jobs by order number
- Labor + material + lodging/freight/misc
- Later: export CSV, compare estimate vs actual

**Status: done** (lookup + cost rollup; export later)

## Phase 4 - Construction / analytics dashboards

- `/analytics` filters: year, branch, job type group (INST vs PU vs Other)
- Monthly LF (`qtyLf`) table by branch × job type group (Construction Data-style)
- Summary cards: jobs, install LF vs pickup LF, revenue, rough labor cost
- SVG stacked bar chart for monthly LF (no heavy chart dependency)
- Server-side Prisma filters; only needed job/labor fields loaded

**Status: done**

## Phase 5 - Auth + private company deploy

- Auth for 1-2 office users (e.g. NextAuth / simple credentials)
- Private repo or private deploy; PostgreSQL via `DATABASE_URL`
- Optional tablet/phone polish for field viewing
- Strip or gate demo seed; import real workbook history carefully (no PII leakage)

**Status: planned**

## Notes

- Desktop-first UI; tables should remain usable on tablet.
- Public repo must keep **fake sample data only**.
