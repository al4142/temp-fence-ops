# Operator’s Guide — Temp Fence Ops

Office and admin guide for the live app. This is a **public demo** with fake sample data (Miami / Davie yards). Product name in the header is **Temp Fence Ops** (amber **demo** badge). Hosting is on the Hardpoint Vercel team — see [Access & environment](#6-access--environment).

**Live app:** [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app)

BOM recipes (locked): [BOM_APPROVED.md](./BOM_APPROVED.md). Architecture: [TECH_SPEC.md](./TECH_SPEC.md). Deploy / env / incidents: [RUNBOOK.md](./RUNBOOK.md). Private-company deploy (real users, no demo seed): [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md).

---

## 1. What this software is

Temp Fence Ops is a temporary-fence operations tracker for install and pickup work (events and construction). It replaces a slow Excel workbook covering daily jobs, inventory by yard, and P&L by order number.

What you actually use day to day:

| Area | What it does |
|------|----------------|
| **Jobs** | Daily tickets: create / edit / delete. Materials, labor, lodging / freight / misc, material variance. **Generate BOM** from fence type + LF + options. **Export Project** downloads an `.xlsx`. |
| **Inventory** | On-hand by yard. Catalog items only move stock. |
| **P&L** | Lookup by order number; rolls up all tickets that share that order. |
| **Related** | Transfers, write-offs, yard expenses, analytics (monthly LF), admin (yards, vendors, employees, inventory catalog, CSV import). |

Data in this demo is **fictional**. Employee records are name, hourly rate, position, and branch only — no SSN, DOB, address, phone, or personal email.

---

## 2. How to access / log in

1. Open [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app). Unauthenticated visits redirect to **Sign in**.
2. Enter email and password. Session cookie lasts about **14 days**. Use **Log out** in the header when you are done (especially on a shared machine).

Demo logins (created by `npm run db:seed`; they exist on the live demo):

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.local` | `DemoAdmin123!` | admin |
| `office@demo.local` | `DemoOffice123!` | office |

**Prefer `admin@demo.local`** when you need the full office workflow. Both seeded accounts currently see the same screens (role is stored on the user; pages are not split by role yet).

> **Demo-only credentials.** These passwords are public in the README and this guide. **Do not use them for real client jobs, real inventory, or a company deploy.** Create real users and a strong `AUTH_SECRET` — see [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md).

---

## 3. How to navigate the site

After sign-in, the header nav is:

| Link | Route | Screen |
|------|-------|--------|
| Dashboard | `/` | Operations dashboard — job / branch / employee counts, booked revenue, recent jobs, inventory attention |
| Jobs | `/jobs` | Job list (filters + **New job**) |
| Inventory | `/inventory` | On-hand by branch |
| Transfers | `/transfers` | Yard-to-yard quantity moves |
| Write-offs | `/write-offs` | Damaged / scrap / shrink |
| Yard expenses | `/expenses` | Yard ledger (not forced onto jobs) |
| P&L | `/pnl` | P&L by order # |
| Analytics | `/analytics` | Monthly LF by branch × job-type group |

**Admin** (same header, after the divider):

| Link | Route | Screen |
|------|-------|--------|
| Yards | `/admin/branches` | Yards / branches |
| Vendors | `/admin/vendors` | Suppliers for yard expenses |
| Employees | `/admin/employees` | Crew on labor lines |
| Inv. admin | `/admin/inventory` | Catalog CRUD + manual adjustments |
| Import | `/admin/import` | CSV import into jobs |

Job sub-pages (from the list or a ticket):

- `/jobs/new` — **Create job**
- `/jobs/[id]` — job detail (**Export Project**, **Edit job**)
- `/jobs/[id]/edit` — **Edit job** (same form as create, plus **Delete job**)

There is no separate “BOM page.” Generate BOM lives on the job create/edit form, in **Materials**.

### Happy path (where to click)

1. Sign in as `admin@demo.local`.
2. Click **Jobs** → **New job**.
3. Fill **Job details** (order #, date, branch, job type). Use **Install** or **Drop** to pull stock, **Pickup** to return it.
4. In **Fence / BOM options**, set the first section (fence type, LF, rails/weights, post mount for chainlink, gates). Add a section to mix driven + plate or panel + chainlink.
5. In **Materials**, click **Generate BOM**. Review the preview table (Item / Qty / Match).
6. Click **Apply to materials** (confirms if you already have material rows).
7. Add **Labor** (and cost lines / variance if needed) → **Create job**.
8. On the job detail page, confirm materials and inventory effect. Optionally **Export Project**.
9. Open **Inventory** to see on-hand. Open **P&L**, enter the order #, **Look up**.

---

## 4. Core functionality

### Jobs (create / edit)

Required: **Order #**, **Date**, **Branch**, **Job type**. Class is EVENT / CONSTRUCTION / OTHER. Also: customer, address, city, account exec, revenue, notes.

Job types in the form: **Install**, **Pickup**, **Drop**, **Other**.

Form sections (in order):

1. **Job details**
2. **Fence / BOM options**
3. **Cost lines** — lodging (amount / facility), freight (company / cost), misc (amount / category)
4. **Materials** — catalog pick or free-text name + qty; **Generate BOM**
5. **Material variance** — signed inventory delta (damaged on site, lost, extra used, returned unused)
6. **Labor** — employee, regular hours, OT (cost uses 1.5× rate)

**Create job** / **Save changes** writes the ticket. Generate BOM does **not** save until you apply and submit.

**Delete job** (edit only) removes the ticket and its material / labor / cost lines. Confirm the dialog; it cannot be undone.

Job list filters (shareable in the URL): from / to date, branch, job type, search (order #, customer, city, address). Pagination is 50 per page.

**Export Project** on the detail page downloads an `.xlsx` for poster handoff.

### Generate BOM

Recipes are locked in [BOM_APPROVED.md](./BOM_APPROVED.md). Calculator: fence type + LF + options. **Same quantities for Install and Pickup**; inventory sign is applied later by job type.

Canonical fence types only:

| Code | Meaning |
|------|---------|
| `CL6` / `CL8` | 6′ / 8′ chainlink |
| `CL6+1` / `CL8+1` | Chainlink + 3-strand barb |
| `6x10` / `6x12` / `8x10` / `8x12` | Panels |
| `BARRICADE` | Bike barricade |

**Legacy fence types.** Anything else (seed jobs use `6ft Panel`) shows as `(legacy — BOM will warn)`. Generate BOM skips the fence recipe and warns. Import of bad labels → BOM empty + warning. No free-text aliases.

#### Canonical walk: 6x10, 400 LF, BFOOT

This is the panel example to trust:

1. **New job** (any branch with the demo BOM catalog — Miami or Davie).
2. Fence type **`6x10`**, Qty (LF) **`400`**, Weights **`BFOOT — big feet (2× stands)`**.
3. **Generate BOM**.

Expected preview (approved math: `n = CEIL(LF/10)` → 40; stands = n+1; clamps/bolts = n−1; big feet = stands × 2):

| Item | Qty | Match (seeded catalog) |
|------|-----|------------------------|
| 6x10 | 40 | catalog |
| T-STANDS | 41 | catalog |
| SADDLE CLAMPS | 39 | catalog |
| CB5/16x2-1/2 | 39 | catalog |
| BIG FEET | 82 | catalog |

Leave weights blank → no BIG FEET / SAND BAG. **SBAG** uses the same 2× stands count as sand bags instead of big feet.

#### Other recipes (short)

**Barricade:** `CEILING(LF / 7)` of BARRICADE. Example: 275 LF → 40.

**Chainlink (CL6 / CL8 / +1):** per section. Wire rolls `CEILING(section LF/50)`; line posts `CEILING(section LF/10)`. **Post mount** is per chainlink section: Driven (bury-length posts) or Plate (fence-height posts + `SCREW-BOLT+ 3/8x3` = `(line×2)+(terminals×4)`). Mixed warehouse/yard = two chainlink sections with the LF split. Aluminum ties `(LF/10)*8` CL6 or `*10` CL8, plus extra ties if top rail. Optional **Top rail** / **Bottom rail**. **Tension wire is not in v1.** Gates and manual terminals are per section; auto terminals = (that section’s gate qty × 2) plus extra track-support posts on 6′ slides.

**CL6+1 / CL8+1:** full CL base, then barb arms (one per line post), barb wire `CEILING((LF×3)/1320)` rolls, plus 3 tension bands per terminal. Top rail defaults **on** for +1 (overridable).

**Screens:** pick a SKU (`BLACK6`, `BLACK8`, `GREEN6`, `GREEN8`, `ROYAL6`, `NAVY6`, `CUSTOM`) — not Yes/No. Rolls = `CEILING(LF/50)`; zip ties = rolls × 110.

**Gates:** Gate + Gate 2 type/qty. Swing hardware follows Excel. **6′ slides** (`12x6` / `15x6` / `20x6` / `24x6 SLIDE`) use the ALE-30 field recipe (per-size brackets, extra track posts, gate-frame 1-3/8″ pipe). Track terminals (gate ×2 + extras) **always show on Generate BOM**, including a **panel-only** section or chainlink with **LF = 0** — you still get the 2-1/2″ posts (`8' x 2-1/2` on CL6). Qty 1: **4 / 5 / 6 / 7** terminals for 12 / 15 / 20 / 24. Chainlink with LF > 0 does **not** double them (`24x6` stays **7**, not 14). **8′ slides** stay on Excel-thin math until takeoff — see [BOM_APPROVED.md](./BOM_APPROVED.md) §7. Known catalog gaps `4x6`, `12x8`, `CUSTOM` still emit a **free-text** line and warn; they do **not** create inventory SKUs. `4x8` is not in the dropdown.

Preview Match column:

- **catalog** — linked to a branch inventory item; will move on-hand when you save.
- **free-text** — name only; **inventory will not move.** The app does not invent catalog rows for unmatched BOM names.

Apply replaces material rows (confirm if rows already exist). Then **Create job** / **Save changes**.

### Materials / catalog

Catalog lives **per yard** (SKU unique per branch). Seed loads both a few demo items (`PANEL-6`, `BASE-STD`, …) **and** the BOM catalog (`6x10`, `T-STANDS`, `SADDLE CLAMP`, `BIG FEET`, chainlink SKUs, gate bodies, …) on Miami (`MIA`) and Davie (`DAV`).

On the job form, the inventory dropdown prefers items for the selected branch. You can still type a free-text name if you leave the catalog pick blank.

Maintain the catalog on **Inv. admin** (`/admin/inventory`): add/edit items, starting qty, unit cost, reusable flag, and **manual adjustments**. Prefer **Deactivate** for SKUs that appear on jobs, transfers, write-offs, or adjustments — hard-delete is blocked when anything still references the item so job history keeps the name. Inactive SKUs stay on past jobs and are hidden from the new-job picker. On-hand uses the same math as `/inventory`.

### Inventory (Install vs Pickup)

On-hand =

starting qty + job movements + adjustments + transfers + write-offs + job material variance.

| Job type | Effect on catalog lines |
|----------|-------------------------|
| Install, Drop | **Outbound (−)** — on-hand down (reusable and consumable) |
| Pickup | **Inbound (+)** — on-hand up **only if reusable**. Consumables (`reusable: false`) stay consumed. |
| Other | No inventory effect |

BOM quantities are the same for Install and Pickup. The inventory sign is separate; consumables never restock.

Free-text material lines do not move stock. Damage / missing on a pickup is **variance** or a **write-off**, not extra Pickup credit.

Transfers (`/transfers`): from yard → to yard; destination SKU is created if missing (starting qty 0). Write-offs (`/write-offs`): damaged / scrap / shrink. Both change on-hand; both are excluded from job analytics.

### P&L

**P&L** (`/pnl`): enter or click an order number → **Look up**. All tickets sharing that order roll up.

Shown: revenue, labor (OT @ 1.5×), material cost (catalog unit cost × qty on **Install / Drop** only; Pickup BOM is a warehouse return, not a second cost; free-text = $0), lodging, freight, misc, material variance, total cost, gross profit.

Yard expenses are a separate ledger (`/expenses`) and are **not** forced onto job P&L.

**Analytics** (`/analytics`): monthly LF by branch and job-type group (Install / Drop vs Pickup vs Other), plus job count, install/drop LF, pickup LF, revenue, rough labor. Job tickets only — not transfers or write-offs.

---

## 5. Known limits

| Limit | What it means for you |
|-------|------------------------|
| **Demo / seed data** | Fake Miami (`MIA`) and Davie (`DAV`) yards, sample jobs (`ORD-1001`, `ORD-2044`, `ORD-1105`), fake employees and catalog. Seed fence type `6ft Panel` is **legacy** — Generate BOM will warn until you switch to a canonical type. |
| **Vercel Hobby + Neon Free** | Live demo on Hobby; database is Neon Postgres (free/demo tier). Expect demo-scale traffic and possible cold starts. Not a production SLA. |
| **No custom domain yet** | Production URL is the Vercel hostname [temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app). |
| **No GitHub CI** | This repo has no `.github` workflows. Deploys follow the Vercel Git integration, not GitHub Actions. |
| **Demo credentials** | `admin@demo.local` / `office@demo.local` are public. Anyone with the URL can sign in. Do not store real client or HR data here. |
| **Auth roles** | `admin` vs `office` is stored but not used to hide screens. Anyone signed in can reach Admin. |
| **BOM gaps** | Tension wire out of scope for v1. Gate SKUs `4x6` and `12x8` (and screen `CUSTOM`) have no inventory match. Purchases / landed / average cost are later. |
| **PII** | Keep sensitive HR fields out of this app. |

---

## 6. Access & environment

Short ops notes for the live demo. Full deploy / migrate / incident steps: [RUNBOOK.md](./RUNBOOK.md). Private-company cutover: [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md).

| Item | Value |
|------|--------|
| **Production URL** | [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app) |
| **Vercel** | Team **HARDPOINT** (`hardpoint1`), **Hobby** plan |
| **Database** | Neon Postgres (`DATABASE_URL`) |
| **App name in UI** | Temp Fence Ops (demo) |

Environment variables (set in the host; **never commit secrets**):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Neon). Migrations need the **direct** (non-pooler) URL. |
| `AUTH_SECRET` | HMAC secret for the signed `tfo_session` cookie. Must be a long random string. |

`NODE_ENV=production` (set by the host) turns on Secure cookies.

**Demo vs real credentials**

- Live demo: seed users only (`admin@demo.local` / `DemoAdmin123!`, `office@demo.local` / `DemoOffice123!`).
- Real client data: **do not use this demo.** Fork/private deploy, migrate schema **without** demo seed, create real users, rotate `AUTH_SECRET`, delete leftover demo accounts. See [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md).

Local / engineering: [README](../README.md) (clone, env, Docker Postgres, seed, tests).
