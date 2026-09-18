# Build plan

Phased replacement of the Excel workbook (Daily Tracker, Inventory by branch, P&L by order #,
Construction rollups, Master installer table).

## Phase 0 - Scaffold + schema + seed

- Next.js App Router, TypeScript, Tailwind, Prisma
- PostgreSQL database (SQLite was the original demo; provider is now postgresql)
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

**Status: done** (computed view + branch filter; adjustment UI in polish)

## Phase 3 - Job P&L by order #  (lookup)

- Lookup page aggregating jobs by order number
- Labor + material + lodging/freight/misc
- Later: export CSV, compare estimate vs actual

**Status: done** (lookup + cost rollup; export later)

## Phase 4 - Construction / analytics dashboards

- `/analytics` filters: year, branch, job type group (Install / Drop vs Pickup vs Other)
- Monthly LF (`qtyLf`) table by branch x job type group (Construction Data-style)
- Summary cards: jobs, install LF vs pickup LF, revenue, rough labor cost
- SVG stacked bar chart for monthly LF (no heavy chart dependency)
- Server-side Prisma filters; only needed job/labor fields loaded

**Status: done**

## Phase 5 - Auth + private company deploy

- Credentials auth: Prisma `User` + bcrypt password hash + signed httpOnly session cookie (`AUTH_SECRET` / jose)
- Seeded demo users (`admin@demo.local`, `office@demo.local`) - demo-only, documented in README
- Middleware protects all app pages except `/login`; job mutating server actions call `requireSession()`
- Login / logout UI; signed-in name in nav
- Private deploy guide: [PRIVATE_DEPLOY.md](PRIVATE_DEPLOY.md) (fork/private repo, Postgres, env vars, Vercel primary path, seed vs migrate, field tips)

**Status: done**

## Polish - Filters, admin CRUD, CSV import

- **Jobs filters** (`/jobs`): date from/to, branch, job type, text search (order #, customer, city, address); query-param driven (shareable); pagination (50/page); clear filters
- **Admin -> Employees** (`/admin/employees`): list/create/edit/deactivate - name, nameKey, hourlyRate, position, branch (no PII)
- **Admin -> Inventory** (`/admin/inventory`): catalog CRUD per branch; manual InventoryAdjustment form; on-hand via existing inventory math; link from `/inventory`
- **Admin -> Import** (`/admin/import`): CSV upload (Excel -> Save As CSV); flexible column aliases; dry-run preview; upsert/skip by orderNumber+date; optional SKU material columns; sample [import-template.csv](import-template.csv) + [IMPORT.md](IMPORT.md)
- Nav: Admin section links for signed-in users

**Status: done**

## Notes

- Desktop-first UI; tables should remain usable on tablet.
- Public repo must keep **fake sample data only**.

## Wave 1 - Ops ledger + cost lines + export

- Admin **Vendors** CRUD; wired into yard expenses
- Job **lodging / freight / misc** line lists on create/edit/detail/P&L (denormalized sums kept)
- **Yard expense** ledger (`/expenses`)
- **Transfers** (`/transfers`) - qty move between yards; exclude from job analytics
- **Write-offs** (`/write-offs`) - damaged/scrap/shrink; exclude from job analytics
- **Job material variance** lines + inventory + P&L variance
- **Export Project** button -> `.xlsx` (exceljs) on job detail
- Pickup BOM / materials from LF or original job - deferred to Wave 2 (README note only)
- Purchases / landed / avg cost - Wave 2-3

**Status: done**

## Wave 2 - Temporary-fence BOM calculator

- Pure TS calculator (`src/lib/bom/`) from [BOM_APPROVED.md](./BOM_APPROVED.md)
- Unit tests for panels, barricade, CL6/CL8 rails, CL6+1/CL8+1 barb, screens, swing/slide gates, terminal hybrid
- Job create/edit: fence options + **Generate BOM** preview/apply (does not silently replace lines)
- Catalog match by inventory name/SKU (aliases for SADDLE CLAMP, etc.)
- Same qtys for Install and Pickup; inventory sign unchanged

**Status: done**
