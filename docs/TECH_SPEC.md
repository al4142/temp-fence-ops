# Technical specification — Temp Fence Ops

System design for the Hardpoint demo of **Temp Fence Ops**. Operator workflows live in [USER_GUIDE.md](./USER_GUIDE.md). Locked BOM recipes live in [BOM_APPROVED.md](./BOM_APPROVED.md). Tables and inventory/P&L formulas live in [DATA_MODEL.md](./DATA_MODEL.md) — this spec does not repeat the full ER.

**Live:** [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app)  
**Repo:** [al4142/temp-fence-ops](https://github.com/al4142/temp-fence-ops)

---

## 1. Purpose

Temp Fence Ops is a daily operations tracker for temporary-fence **install** and **pickup** work (events and construction). It replaces a slow Excel workbook that covered:

- Daily job tickets (order number, yard, materials, labor, cost lines)
- Inventory on-hand by yard
- P&L rolled up by order number

The public demo uses **fake sample data only** (Miami / Davie yards). Employee rows store name, hourly rate, position, and branch — no SSN, DOB, address, phone, or personal email.

---

## 2. High-level architecture

```
Browser
  │  HTTPS
  ▼
Next.js 15 App Router  (Vercel Hobby · team HARDPOINT / hardpoint1)
  │  middleware.ts  — JWT cookie gate (except /login + static)
  │  Server Components + Server Actions
  │  Client BOM preview (src/lib/bom) on job create/edit
  ▼
Prisma Client  (src/lib/prisma.ts)
  ▼
Neon Postgres  (DATABASE_URL)
```

Request flow:

1. Unauthenticated HTML routes redirect to `/login` (`src/middleware.ts`).
2. Sign-in checks `User.email` + bcrypt `passwordHash`, then sets an httpOnly JWT cookie (`tfo_session`).
3. Pages load data with Prisma in Server Components (`export const dynamic = "force-dynamic"` on data pages).
4. Mutations go through Server Actions that call `requireSession()` then Prisma transactions.
5. **Generate BOM** runs in the browser (`calculateBom` in `JobForm`) so the operator can preview/apply before save. Saving still goes through the job Server Action.

There is no separate API surface besides the job **Export Project** route (`GET /jobs/[id]/export`). No GitHub Actions in this repo; production deploys are the Vercel Git integration on `main` — see [RUNBOOK.md](./RUNBOOK.md).

---

## 3. Stack

| Layer | Choice | Notes |
|-------|--------|--------|
| UI / app | Next.js **15** App Router, React **19**, TypeScript, Tailwind CSS **4** | `src/app`, `src/components` |
| ORM | Prisma **5** (`provider = "postgresql"`) | `prisma/schema.prisma`; SQLite is not supported |
| Database | **Neon Postgres** in demo/production; Docker Postgres (or a Neon branch) locally | Single `DATABASE_URL` |
| Host | **Vercel** Hobby, team **HARDPOINT** (`hardpoint1`) | Production hostname `temp-fence-ops.vercel.app` |
| Auth | Credentials + **jose** HS256 JWT in httpOnly cookie `tfo_session` | Secret: `AUTH_SECRET` (min 16 chars). **Not** Auth.js / NextAuth. |
| Passwords | **bcryptjs** (cost 10) on `User.passwordHash` | Seeded demo hashes only |
| Export | **ExcelJS** | Job detail → `.xlsx` |
| Tests | **Vitest** | BOM calculator unit tests (`src/lib/bom/calculate.test.ts`) |

Runtime uses one Prisma client singleton (`src/lib/prisma.ts`). Build runs `prisma generate && next build` (`npm run build` / `postinstall`).

---

## 4. Data model summary

Canonical ER, inventory sign table, and P&L formulas: **[DATA_MODEL.md](./DATA_MODEL.md)**. Schema source of truth: `prisma/schema.prisma`. Current migration history is a single PostgreSQL baseline (`prisma/migrations/20260916220000_init_postgresql`).

Entities in short:

| Area | Models |
|------|--------|
| Org | `Branch` (yard; unique `code`), `Vendor`, `Employee` (office-safe fields), `User` (login) |
| Jobs | `Job` plus `JobMaterial`, `JobLabor`, `JobLodgingLine`, `JobFreightLine`, `JobMiscLine`, `JobMaterialVariance` |
| Stock | `InventoryItem` (per-branch catalog, `@@unique([branchId, sku])`), `InventoryAdjustment`, `Transfer` / `TransferLine`, `WriteOff` |
| Yard ledger | `YardExpense` (not forced onto job P&L) |

**Inventory is computed, not stored.** On-hand = starting qty ± signed job materials ± adjustments ± transfers ± write-offs ± job variances (`src/lib/inventory.ts`). Catalog-linked lines only; free-text materials do not move stock.

**Job lodging / freight / misc** are line tables. `Job.lodging|freight|misc` stay as denormalized sums for simple rollups.

**BOM fields on `Job`** (optional; inputs for Generate BOM): `fenceType`, `qtyLf`, `topRail`, `bottomRail`, `weightMode` (`BFOOT` / `SBAG`), `screenSku`, `gateType`/`gateQty`, `gateType2`/`gateQty2`, `terminalsManual`. `gates` and `screen` are denormalized.

---

## 5. Key modules

### Jobs

| Piece | Where |
|-------|--------|
| Routes | `/jobs`, `/jobs/new`, `/jobs/[id]`, `/jobs/[id]/edit` |
| Mutations | `src/app/jobs/actions.ts` (`createJob` / `updateJob` / `deleteJob`) |
| Form | `src/components/JobForm*.tsx`, `src/lib/job-form.ts` |
| Types | `src/lib/job-constants.ts` (`INST`, `PU`, `PICKUP`, `DELIVERY`, …) |

Create/edit is a transactional upsert: job row, then replace materials, labor, cost lines, and variances. Filters on the list are query-param driven (50/page). **Export Project** (`src/lib/export-project.ts`) downloads an `.xlsx` for poster handoff.

### Inventory

| Piece | Where |
|-------|--------|
| On-hand view | `/inventory` — `src/lib/inventory.ts` `computeOnHand` |
| Catalog + adjustments | `/admin/inventory` |
| Transfers | `/transfers` — from yard → to yard; destination SKU created if missing; **excluded from job analytics** |
| Write-offs | `/write-offs` — damaged / scrap / shrink; **excluded from job analytics** |

Sign: INST / INSTALL / DELIVERY / DEL / DROP → on-hand **down**; PU / PICKUP / PICK-UP / RETURN / RET → on-hand **up**. Unrecognized types → no inventory effect. Same BOM quantities for INST and PU; only the sign changes.

### BOM calculator (`src/lib/bom`)

| File | Role |
|------|------|
| `calculate.ts` | Pure `calculateBom(input)` → lines + warnings |
| `catalog.ts` | Canonical fence / gate / screen / weight codes, seed SKUs, name aliases |
| `match-catalog.ts` | Map BOM names to branch `InventoryItem` (or free-text) |
| `types.ts` | `BomInput` / `BomResult` / matched materials |
| `calculate.test.ts` | Vitest coverage of locked recipes |

UI: **Fence / BOM options** + **Generate BOM** on the job form (`JobFormBomOptions`, `JobFormMaterials`). Preview does not persist until **Apply to materials** and **Create job** / **Save changes**. Apply confirms before replacing existing material rows. Unmatched names stay free-text — the app does **not** invent catalog SKUs.

### P&L

| Piece | Where |
|-------|--------|
| Lookup UI | `/pnl` |
| Rollup | `src/lib/pnl.ts` `buildOrderPnL` |

Lookup is **by order number** (all tickets that share it: typically INST then PU). Components: revenue, labor (OT at **1.5×**), material cost (`qty × InventoryItem.unitCost`; free-text → $0), lodging / freight / misc (line sums, fallback denormalized fields), material variance (`-qty × unitCost`), gross profit. Transfers, write-offs, and yard expenses are **not** in job P&L.

Related: `/analytics` (`src/lib/analytics.ts`) — monthly LF by branch × job-type group (INST / PU / OTHER). Job tickets only.

### Other product surfaces

- Dashboard `/` — counts, recent jobs, inventory attention
- Yard expenses `/expenses` — PPE / Consumables / Tools / Food / Equipment / Other
- Admin: yards, vendors, employees, inventory, CSV import (`docs/IMPORT.md`)

---

## 6. BOM — fence types and options

**Math and locked decisions:** [BOM_APPROVED.md](./BOM_APPROVED.md). Do not treat `BOM_FROM_EXCEL_DRAFT.md` as live unless APPROVED points at it.

Canonical `fenceType` values only (no free-text aliases). Bad / legacy labels (seed jobs use `6ft Panel`) → recipe skipped + warning.

| Code | Kind |
|------|------|
| `CL6`, `CL8` | Chainlink |
| `CL6+1`, `CL8+1` | Chainlink + 3-strand barb |
| `6x10`, `6x12`, `8x10`, `8x12` | Panels |
| `BARRICADE` | Bike barricade |

Independent options (as implemented):

| Option | Applies to | Notes |
|--------|------------|--------|
| Top rail / bottom rail | Chainlink | Same 1-3/8″ tube; +1 defaults top rail **on** in the form (overridable) |
| Weights `BFOOT` / `SBAG` | Panels | 2 × T-stands; blank → no weights |
| Screen SKU | Any | SKU pick (`BLACK6`, …), not Yes/No |
| Gate + Gate 2 | Any | Bodies + swing/slide hardware; terminals = `(gateQty + gateQty2) × 2 + terminalsManual` |
| Tension wire | — | **Out of scope for v1** (not shown, not BOM’d) |

Canonical smoke (also in tests / runbook): **6x10 / 400 LF / BFOOT** → 40 panels / 41 T-STANDS / 39 SADDLE CLAMPS / 39 CB5/16x2-1/2 / 82 BIG FEET.

Known catalog gaps (`4x6`, `12x8`, screen `CUSTOM`) still emit free-text lines and warn.

---

## 7. Auth and roles

| Piece | Behavior |
|-------|----------|
| Login | `/login` → `authenticateUser` (`src/lib/auth.ts`, `src/app/login/actions.ts`) |
| Session | Signed JWT cookie `tfo_session`, **14 days**, `httpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV=production` |
| Gate | Middleware: all app paths except `/login` and static. Mutating Server Actions + export route call `requireSession()` |
| User | `User.role` string, default `"office"`; intended values **`admin`** \| **`office`** |

**Current demo:** role is stored on the user and copied into the JWT. It is **not** used to hide screens. Admin nav (`/admin/*`) is visible to every signed-in user. There is no `requireAdmin()`. Prefer `admin@demo.local` for the full office walkthrough; both seeded accounts see the same UI.

Not SSO, not Auth.js, not row-level security.

---

## 8. Non-goals / out of scope

This codebase and the Hardpoint demo are **not**:

- A private company cutover with real client jobs or HR PII (see [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md) if that is the path)
- Role-based authorization (Admin hidden from `office`, field-only roles, audit log)
- SSO / enterprise identity
- A stored inventory ledger or purchases / landed / average-cost engine (Wave 3)
- Tension-wire BOM, permanent/Hoover fence math, or free-text fence-type aliases
- GitHub Actions CI, a custom domain, or a production SLA (Vercel Hobby + Neon free/demo)
- Mobile-first field data collection (layout is desktop-first, usable on tablet)
- Auto-creating catalog SKUs for unmatched BOM names
- Including transfers, write-offs, or yard expenses in job P&L / analytics

Phased history: [BUILD_PLAN.md](./BUILD_PLAN.md) (Phases 0–5, polish, Wave 1 ledger, Wave 2 BOM — implemented).
