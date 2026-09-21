# Technical specification / system design — Temp Fence Ops

System design for the **Temp Fence Ops** demo (Hardpoint). Office/admin usage is in the [Operator’s Guide](./USER_GUIDE.md). Deploy and incidents are in the [Runbook](./RUNBOOK.md).

**Live app:** [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app)

This document describes the system **as implemented on `main`**. It is not a wishlist.

---

## 1. Purpose

Temp Fence Ops is a temporary-fence operations tracker for install and pickup work (events and construction). It replaces a slow Excel workbook covering:

- Daily **jobs** (tickets) with materials, labor, and cost lines
- **Inventory** on-hand by yard (branch)
- **P&L** rolled up by order number
- A locked **BOM calculator** (fence type + LF + options → material list)

The public repo and live demo use **fake sample data only** (Miami / Davie yards). Employee records are name, hourly rate, position, and branch — no SSN, DOB, address, phone, or personal email.

---

## 2. High-level architecture

```
┌─────────────┐     HTTPS      ┌──────────────────────────────────┐
│  Browser    │───────────────▶│  Next.js App Router (Vercel)     │
│  (office)   │                │  src/app/*  +  src/components/*  │
└─────────────┘                │                                  │
                               │  middleware.ts                   │
                               │    JWT cookie tfo_session        │
                               │  Server Components / Actions     │
                               │  src/lib/{bom,inventory,pnl,…}   │
                               └──────────────┬───────────────────┘
                                              │ Prisma Client
                                              │ (DATABASE_URL)
                                              ▼
                               ┌──────────────────────────────────┐
                               │  Neon Postgres                   │
                               └──────────────────────────────────┘
```

Request flow:

1. Unauthenticated requests hit `src/middleware.ts` and redirect to `/login` (except login and static assets).
2. Signed-in pages are React Server Components. Mutations are Next.js **server actions** that call `requireSession()` before writing.
3. Prisma talks to a single Postgres database. Inventory on-hand and P&L are **computed** from stored tickets and catalog rows — they are not stored balances.

Hosting: Vercel Hobby team **Hardpoint** (`hardpoint1`) + Neon Postgres. No custom domain. No GitHub Actions CI in this repo — deploys follow Vercel’s Git integration (`main` → production). See [RUNBOOK.md](./RUNBOOK.md).

---

## 3. Stack

| Layer | Choice | Notes |
|-------|--------|--------|
| UI / routing | **Next.js 15 App Router**, React 19, TypeScript, Tailwind CSS 4 | `src/app/` routes; `src/components/` client forms |
| ORM | **Prisma** (`provider = postgresql`) | Client generated on `postinstall` / `npm run build` |
| Database | **PostgreSQL** — Neon in demo/production; Docker or a Neon branch locally | SQLite (`file:./dev.db`) is **not** supported |
| Host | **Vercel** (Hobby) | `npm run build` = `prisma generate && next build` |
| Auth | Credentials + signed **httpOnly** cookie | `jose` HS256 JWT; bcrypt password hashes |
| Spreadsheet export | **ExcelJS** | Job detail **Export Project** → `.xlsx` |
| Tests | **Vitest** | BOM calculator unit tests (`src/lib/bom/calculate.test.ts`) |

### Auth cookies (current)

| Item | Value |
|------|--------|
| Cookie name | `tfo_session` |
| Secret | `AUTH_SECRET` (HMAC; must be ≥ 16 characters) |
| Token | JWT (HS256) via `jose`; subject = user id; claims: email, name, role |
| Flags | `httpOnly`, `sameSite=lax`, `secure` when `NODE_ENV=production`, path `/` |
| TTL | 14 days |
| Implementation | `src/lib/auth.ts` (Node), `src/middleware.ts` (Edge-safe verify only — no Prisma) |

`NEXTAUTH_SECRET` / Auth.js is **not** used. Login is a server action (`src/app/login/actions.ts`) against Prisma `User`.

Environment variable names: `DATABASE_URL`, `AUTH_SECRET`. Template: `.env.example`. One `DATABASE_URL` for runtime and for `prisma migrate deploy` on the Vercel build (`npm run build`). Use the **direct** (non-pooler) Neon URL. Details: [RUNBOOK.md](./RUNBOOK.md).

---

## 4. Data model summary

Full ER, inventory signs, and P&L formulas: **[DATA_MODEL.md](./DATA_MODEL.md)**. Schema: `prisma/schema.prisma`. Do not treat this section as a second ER diagram.

Core idea:

- **Branch** = yard (`MIA`, `DAV` in seed).
- **InventoryItem** is catalog **per branch** (`@@unique([branchId, sku])`). In-use SKUs are deactivated (`active: false`), not hard-deleted.
- **Job** is one daily ticket. Several jobs can share an `orderNumber` (install then pickup).
- Job children: materials, labor, lodging/freight/misc lines, material variance.
- Yard ledger (not job P&L): transfers, write-offs, yard expenses, vendors.
- **User** = office login (`email`, bcrypt `passwordHash`, `name`, `role`).

On-hand is derived (`src/lib/inventory.ts`): starting qty ± signed job movements ± adjustments ± transfers ± write-offs ± job material variance. Only catalog-linked lines move stock. **Cancelled** jobs contribute 0 (materials/variances kept).

P&L is derived by order number (`src/lib/pnl.ts`): revenue, labor (OT @ 1.5×), catalog material cost on outbound jobs only (Install / Drop; Pickup BOM is not a second cost), cost lines, material variance. **Cancelled** tickets are excluded. Transfers, write-offs, and yard expenses are **excluded**.

---

## 5. Key modules

### Jobs

| Path | Role |
|------|------|
| `src/app/jobs/` | List, create, detail, edit; `actions.ts` persist |
| `src/components/JobForm*.tsx` | Create/edit form (details, BOM options, materials, labor, cost lines, variance) |
| `src/lib/job-form.ts`, `src/lib/job-constants.ts` | Validation; `JOB_TYPES` (`Install`, `Pickup`, `Drop`, `Other`, `Site Walk`); `JOB_STATUSES` (`Active`, `Cancelled`); `CANCEL_JOB_CONFIRM`; `JOB_CLASSES` vs `SITE_WALK_CLASSES` |
| `src/lib/jobs-list.ts` | Jobs table `where` (date / branch / type / search; optional `?hideCancelled=1` via `parseHideCancelled`); From=To same date is the day list |
| `src/components/JobStatusBadge.tsx` | Rose **Cancelled** badge next to the type badge |
| `src/app/jobs/[id]/export/route.ts`, `src/lib/export-project.ts` | **Export Project** `.xlsx` |

Required ticket fields: order #, date, branch, job type. **Generate BOM** lives on the job form under Materials — there is no standalone BOM page. Generate BOM previews in the browser; **Apply to materials** then **Create job** / **Save changes** writes the ticket.

Job types that move inventory: outbound `Install` / `Drop`; inbound `Pickup`. `Other`, `Site Walk` (and any unrecognized string) have no inventory effect (`inventorySignForJobType` → `0`; Jobs table Inv. = “No inventory effect”). **Cancelled** status forces sign 0 regardless of type (`inventorySignForJobType(jobType, status)`, `inventorySignForMaterial(..., status)`). The job form accepts only the Title Case labels.

**Cancelled** (additive `Job.status`; default **Active**): create always writes `Active` (`createJob` hard-sets it). Edit shows Status select (`showStatus` on `JobFormDetails`); Active → Cancelled confirms with `CANCEL_JOB_CONFIRM` (“Stays on Jobs and the day list. No inventory or P&L.”); Cancelled → Active has no confirm. `jobsListWhere` has no status predicate unless `hideCancelled` (`?hideCancelled=1`). `buildOrderPnL` / `countsTowardMaterialCost` / analytics (`isCancelledStatus`) skip Cancelled tickets; order rollup `jobCount` is Active only. Materials / labor / variances are kept (not wiped). Active Install / Pickup / Drop / Other / Site Walk behavior is otherwise unchanged.

**Site Walk** (additive in `src/lib/job-constants.ts` / `JobFormDetails`): class dropdown is **Non Pay** / **Site Visit** (`classesForJobType`); switching type replaces class with the first option of the new set when the previous class is not in that set. Fence and materials may be empty (`allowsEmptyFenceAndMaterials`) — Install still errors on an unnamed non-zero material row. Labor may include a 0/0 hour row (`allowsZeroHourLabor`; form hint exists). Jobs list never filters on revenue, materials, labor, fence, or class, so a $0 / blank-materials Site Walk is a normal row. There is no calendar widget: **From** and **To** set to the same date on `/jobs` is the day list (`jobs-list.ts`). Cancelled still overrides inventory/P&L on a Site Walk the same as any other type.

**CSV import** (`src/lib/csv-import.ts`, `/admin/import`) maps known Daily Tracker aliases from `IMPORT_JOB_TYPE_ALIASES` (`INST` → Install, `PU` → Pickup, `DELIVERY` → Drop, `SITEWALK` / `SITE-WALK` → Site Walk; spaces and underscores collapse to `-`, so `SITE WALK` / `site_walk` also map). Unknown codes reject the row (never silent Other), including `SWLK`. There is **no** class alias table — `class` is stored as-is. There is **no** Status column — creates are always `Active`; re-import `jobFields` omit `status` so a cancelled ticket stays cancelled. Import then runs the same `validateAndNormalize` as the form and commits accepted rows in one transaction. Preview shape: [IMPORT.md](./IMPORT.md).

### Inventory

| Path | Role |
|------|------|
| `src/lib/inventory.ts` | Sign by job type + `status` + on-hand computation (`Cancelled` → 0) |
| `src/app/inventory/page.tsx` | On-hand by branch |
| `src/app/admin/inventory/` | Catalog CRUD + manual adjustments |
| `src/app/transfers/`, `src/app/write-offs/` | Yard-to-yard qty moves; damaged/scrap/shrink |

Catalog pick on a job line links `JobMaterial.inventoryItemId` and drives stock + P&L cost. Free-text `itemName` does **not** move inventory and costs $0 on P&L.

### BOM calculator

| Path | Role |
|------|------|
| `src/lib/bom/calculate.ts` | Pure TypeScript recipes (`calculateBom`) |
| `src/lib/bom/catalog.ts` | Canonical fence types, SKUs, aliases, seed catalog items |
| `src/lib/bom/match-catalog.ts` | Match generated names to branch inventory |
| `src/lib/bom/types.ts`, `src/lib/bom/index.ts` | Public types / re-exports |
| `src/lib/bom/calculate.test.ts` | Vitest coverage |
| `src/components/JobForm.tsx` | Generate BOM preview / apply |

Install vs Pickup does **not** change BOM quantities. Inventory sign is applied later from `jobType` (and `status` — Cancelled → 0). Unmatched names stay free-text; the app does not invent catalog rows.

Fence types, options, and the canonical smoke example are in [§6](#6-bom--fence-types-and-options). Point math: [BOM_APPROVED.md](./BOM_APPROVED.md).

### P&L

| Path | Role |
|------|------|
| `src/app/pnl/page.tsx` | Lookup UI (`?order=`) |
| `src/lib/pnl.ts` | `buildOrderPnL` — sums Active jobs sharing an order number; Cancelled excluded; materials from outbound tickets only |

Analytics (`src/app/analytics/`, `src/lib/analytics.ts`) is monthly LF by branch × job-type group from **job tickets only**. Groups follow inventory sign: Install / Drop, Pickup, Other (`Site Walk` groups with Other). Cancelled tickets are skipped (`isCancelledStatus`).

Related office screens (not part of job P&L): `/expenses` (yard ledger), `/admin/vendors`, `/admin/branches`, `/admin/employees`, `/admin/import`.

---

## 6. BOM — fence types and options

Locked recipes: **[BOM_APPROVED.md](./BOM_APPROVED.md)**. Historical Excel reverse-engineer: [BOM_FROM_EXCEL_DRAFT.md](./BOM_FROM_EXCEL_DRAFT.md) (use only where APPROVED points at it).

Canonical fence types only (`src/lib/bom/catalog.ts` `FENCE_TYPES`):

| Code | Meaning |
|------|---------|
| `CL6` / `CL8` | 6′ / 8′ chainlink |
| `CL6+1` / `CL8+1` | Chainlink + 3-strand barb |
| `6x10` / `6x12` / `8x10` / `8x12` | Panels |
| `BARRICADE` | Bike barricade |

No free-text aliases. Legacy labels (seed jobs use `6ft Panel`) → Generate BOM warns and skips the fence recipe.

Options on the job form live on **`Job.fenceSections[]`** (plus job-level `screenSku`). Default new job = one driven chainlink section. Add section / Remove for mixed runs.

| Option | Applies to | Behavior |
|--------|------------|----------|
| **Top rail** / **Bottom rail** | Chainlink section | Same 1-3/8″ tube; independent toggles. Top rail defaults on for `+1` in the UI (overridable). |
| **Post mount** | Chainlink section | `Driven` (default, bury-length posts) or `Plate (concrete)` (fence-height posts + `SCREW-BOLT+ 3/8x3` = 2× line + 4× terminals). Not a job-wide toggle. |
| **Weights** | Panel section | `BFOOT` (big feet) or `SBAG` (sand bags) = 2 × T-stands. Blank = no weights. |
| **Gates / manual terminals** | Each section | Auto terminals = that section’s gate qty × 2. 6′ slides add ALE-30 extra track-support posts — recipe and emit rule in [BOM_APPROVED.md](./BOM_APPROVED.md) §7. The 2-1/2″ stack (gate ×2 + extras) **always emits**, including chainlink LF = 0 and panel/barricade hosts. Chainlink LF > 0 must **not** double-count (`24x6` qty 1 → 7, not 14). |
| **Screen SKU** | Any | SKU pick (`BLACK6`, …), not Yes/No. `CUSTOM` is a known catalog gap. |
| **Gates** | Any | Gate + Gate 2 type/qty. Auto terminals = (gate qty × 2) plus 6′ slide extras per ALE-30 §7. Same emit rule as above (LF=0 / panel-host still emit; no double-count when CL+LF>0). Known gaps `4x6`, `12x8` emit free-text. |
| **Manual terminals** | Chainlink | Corners / start-stop / extras. |
| **Tension wire** | — | **Out of scope for v1** (not shown, not BOM’d). |

Canonical smoke (also in the Operator’s Guide): **6x10, 400 LF, BFOOT** → 40 panels / 41 T-STANDS / 39 SADDLE CLAMPS / 39 CB5/16x2-1/2 / 82 BIG FEET.

---

## 7. Auth and roles

| Role value | Seeded demo user | What the app does today |
|------------|------------------|-------------------------|
| `admin` | `admin@demo.local` | Stored on `User.role` and in the JWT |
| `office` | `office@demo.local` | Same screens as admin |

**Current demo:** role is stored; **Admin is not hidden.** `Nav` always shows Yards / Vendors / Employees / Inv. admin / Import for any signed-in user. Middleware and `requireSession()` only check “is this a valid session?”, not role. Prefer the admin demo login for the full office walkthrough; do not assume an `office` user is locked out of `/admin/*`.

Auth is credentials for 1–2 office users. Not SSO, not enterprise IdP.

---

## 8. Non-goals / out of scope

Not in this system today (and not implied by this spec):

- Role-based UI or route hiding (`admin` vs `office`)
- SSO / Auth.js / NextAuth / OAuth
- Tension-wire BOM
- Purchases, landed cost, or average-cost engine (noted as later / Wave 3 in data-model comments)
- Putting transfers, write-offs, or yard expenses onto job P&L / analytics
- Inventing inventory SKUs for unmatched BOM names or known catalog gaps
- Custom domain, GitHub Actions CI, production SLA
- Real client jobs, real inventory, or HR PII on the public demo
- Seeding demo users/data into a real company database (see [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md) and [RUNBOOK.md](./RUNBOOK.md))

Related but separate docs: [BUILD_PLAN.md](./BUILD_PLAN.md) (phased history), [IMPORT.md](./IMPORT.md) (CSV import), [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md) (fork / real users).
