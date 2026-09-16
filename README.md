# Temp Fence Ops

Public demo of an operations tracker for temporary fence install and pickup work (events & construction).
Replaces a slow Excel workbook covering daily jobs, inventory by branch, and P&L by order number.

**This repository uses fake sample data only.** Employee records include name, hourly rate, position, and branch - no SSN, DOB, address, phone, or personal email.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM
- SQLite for the public demo (`file:./dev.db`)
- ExcelJS for **Export Project** (.xlsx)

Company / private deploys can switch to PostgreSQL by changing the Prisma `provider` and setting `DATABASE_URL` (see `.env.example`).

## Quick start (fresh)

```bash
npm install
cp .env.example .env   # set DATABASE_URL + AUTH_SECRET
npx prisma migrate dev
npm run db:seed
npm run dev
```

### After pull (existing DB)

```bash
git pull
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to **Sign in**.

### Demo logins (demo-only)

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.local` | `DemoAdmin123!` | admin |
| `office@demo.local` | `DemoOffice123!` | office |

These accounts exist only after `npm run db:seed`. **Do not use them in a real company deploy** — create new users and set a strong `AUTH_SECRET` (see [docs/PRIVATE_DEPLOY.md](docs/PRIVATE_DEPLOY.md)).

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run start` | Start production server |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed fake Miami/Davie sample data |
| `npm run db:reset` | Reset DB + re-seed |
| `npm test` | BOM calculator unit tests (vitest) |

## What you can see in the demo

- **Dashboard** - counts, recent jobs, inventory attention
- **Jobs** - list with filters, create/edit/delete, detail with materials, labor, cost lines, material variance; **Generate BOM** from fence type + LF + options (preview/apply); **Export Project** downloads an `.xlsx` for poster handoff
- **Inventory** - on-hand by branch (starting +/- job moves +/- adjustments +/- transfers +/- write-offs +/- job variance)
- **Transfers** (`/transfers`) - from yard → to yard, lines item+qty; inventory from down / to up; excluded from job analytics
- **Write-offs** (`/write-offs`) - damaged/scrap/shrink; qty down; excluded from job analytics
- **Yard expenses** (`/expenses`) - date, yard, category, vendor, amount, purchased by, notes (not forced onto jobs)
- **P&L** - lookup by order number; sums lodging/freight/misc lines + material variance
- **Analytics** - monthly LF by branch × job type (`/analytics`) — job tickets only
- **Admin**
  - **Yards / branches** (`/admin/branches`)
  - **Vendors** (`/admin/vendors`) - name, optional notes, active (wired into yard expenses; future purchases)
  - **Employees** (`/admin/employees`)
  - **Inventory admin** (`/admin/inventory`)
  - **CSV import** (`/admin/import`)

Inventory movement: `INST` / `DELIVERY` decrease on-hand; `PU` / `PICKUP` increase it. Details in [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

## Wave 1 notes

- Job **lodging / freight / misc** are line lists (amount/facility, company/cost, category/amount). `Job.lodging|freight|misc` stay as denormalized sums for rollups.
- **Transfers** move quantity only. Carry cost is conceptual; Wave 3 will refine average cost on `InventoryItem`.
- **Pickup / install BOM** — same recipes for INST and PU; inventory sign is still INST down / PU up. Generate BOM on job create/edit from LF + fence type + options.
- Screen is a **SKU pick** (BLACK6, …), not Yes/No.
- Purchases / landed cost / avg cost engine still later.

## Public demo vs private company use

| | Public demo (this repo) | Private company deploy |
|--|-------------------------|-------------------------|
| Data | Fake sample only | Real ops data (private) |
| Database | SQLite file | Prefer PostgreSQL |
| Auth | Demo credentials (seeded) | Private deploy: real users + strong AUTH_SECRET |
| PII | None beyond name/rate/role | Keep sensitive HR fields out or gated |

## Phase / wave status

Phases 0–5 plus polish and Wave 1 are implemented. **Wave 2 BOM calculator** is implemented (job create/edit Generate BOM). See [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md).

## Auth

Simple credentials for 1–2 office users: bcrypt-hashed passwords in Prisma `User`, signed httpOnly session cookie. Middleware guards pages; mutating actions call `requireSession()`. Not SSO/enterprise.

## Docs

- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) - tables, inventory rules, P&L
- [docs/BOM_APPROVED.md](docs/BOM_APPROVED.md) - **live** temporary-fence BOM recipes (locked)
- [docs/BOM_FROM_EXCEL_DRAFT.md](docs/BOM_FROM_EXCEL_DRAFT.md) - historical Excel reverse-engineer (use only where APPROVED points at it)
- [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) - phased roadmap
- [docs/PRIVATE_DEPLOY.md](docs/PRIVATE_DEPLOY.md) - private repo, Postgres, env, hosts, production users
- [docs/IMPORT.md](docs/IMPORT.md) - Excel → CSV import
- [docs/import-template.csv](docs/import-template.csv) - sample import file

## License

Private use by the repo owner unless otherwise stated. Sample data is fictional.
