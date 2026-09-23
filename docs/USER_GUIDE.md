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
| Yards | `/admin/branches` | Yards / branches; a new yard copies the Davie catalog at qty 0 |
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
4. In **Fence / BOM options**, set the first section (fence type, LF, rails/weights, post mount for chainlink, gates), then **Screen SKU (job total LF)** if needed. **Add section** sits below Screen SKU (new section appears above Screen SKU) when you mix driven + plate or panel + chainlink.
5. In **Materials**, click **Generate BOM**. Review the preview table (Item / Qty / Match).
6. Click **Apply to materials** (confirms if you already have material rows).
7. Add **Labor** (and cost lines / variance if needed) → **Create job**.
8. On the job detail page, confirm materials and inventory effect. Optionally **Export Project**.
9. Open **Inventory** to see on-hand. Open **P&L**, enter the order #, **Look up**.

**Site Walk (unpaid visit):** **Jobs** → **New job** → type **Site Walk**. Class becomes **Non Pay** / **Site Visit**. Fence and materials may stay blank. Labor is optional (0 hrs still attributes a supervisor). Save, then open **Jobs**, set **From** and **To** to that date, **Apply**. There is no separate calendar page — that table is the day list. A $0 / no-materials Site Walk is still a normal row (**Inv.** = **No inventory effect**).

**Relocate (billable move):** **Jobs** → **New job** → type **Relocate**. Class stays **CONSTRUCTION** (the **Create job** default — options remain **EVENT** / **CONSTRUCTION** / **OTHER**, same as Install; **not** Non Pay / Site Visit; those stay Site Walk only). Fence and materials may stay blank (same empty path as Site Walk; no new stock). Labor is **billable** normal hours — **0-hr labor remains Site Walk only**. Revenue and labor show on P&L. Save, then open **Jobs**, set **From** and **To** to that date, **Apply**. A no-materials Relocate is still a normal row (**Inv.** = **No inventory effect**); the day-list banner may call out Relocate with no materials.

**Cancel a scheduled job:** **Jobs** → **Edit** on an existing ticket (create has no Status picker — new jobs are always **Active**). Set Status **Cancelled**. Confirm: “Stays on Jobs and the day list. No inventory or P&L.” Save. The type badge is unchanged; a rose **Cancelled** badge sits next to it. Set **From** and **To** to that date, **Apply** — it stays on the day list (the banner can mention Cancelled). **Inv.** = **No inventory effect** regardless of Install / Pickup / Drop / Other / Site Walk / Relocate. On-hand does not move; P&L omits the ticket. Check **Hide cancelled** (URL `hideCancelled=1`) to omit it. Status back to **Active** has no confirm and restores that type’s inventory / P&L rules. Use **Delete job** only for a true mistake.

---

## 4. Core functionality

### Jobs (create / edit)

Required: **Order #**, **Date**, **Branch**, **Job type**. **Create job** defaults **Class** to **CONSTRUCTION** for Install, Pickup, Drop, Other, and Relocate. **Edit job** keeps the saved class. Options stay EVENT / CONSTRUCTION / OTHER for those types, and **Non Pay** / **Site Visit** for Site Walk. Changing type swaps the class dropdown to the matching set (and resets the value if the previous class is not in the new set) — Site Walk still becomes **Non Pay**. Also: customer, address, city, account exec, revenue, notes.

**Contact 1** and **Contact 2** are optional free text (a name and phone in one string). On **Job details**, **Revenue**, **Contact 1**, and **Contact 2** sit on one row; **Notes** is full width underneath. Leave either contact blank — the ticket still saves. Clearing a contact does not change Notes. **Create job** and **Save changes** persist both. Job detail shows Contact 1 and Contact 2 (blank as “-”). **Export Project** includes them on the summary sheet.

Job types in the form: **Install**, **Pickup**, **Drop**, **Other**, **Site Walk**, **Relocate**.

**Site Walk** (additive; Install / Pickup / Drop / Other / Relocate are unchanged): unpaid site visit / preconstruction walk. Fence type and materials may be blank. Labor is optional, including **0-hr** attribution (the Labor section hint says 0 hours is allowed so a supervisor is attributed without labor cost). Inventory sign is 0 — the Jobs table **Inv.** column shows **No inventory effect**. A $0 ticket with no materials is still a normal Jobs table row for its date. Class is not a Jobs-table column; the type badge is enough. Install still errors on an empty unnamed materials row (`Each material line needs an inventory item or a name`).

**Relocate** (additive; contrast with Site Walk): client asks the installer to move a fence section. Empty fence/materials allowed via the same path as Site Walk. **Unlike Site Walk:** class stays **EVENT** / **CONSTRUCTION** / **OTHER** (a new job defaults to **CONSTRUCTION**; edit keeps the saved class; never Non Pay / Site Visit), and **0-hr labor is not allowed** — hours are billable and a 0/0 labor row is dropped (same as Install). Hours and revenue count on P&L. Inventory sign is 0 — Jobs table **Inv.** = **No inventory effect**.

Form sections (in order):

1. **Job details** — **Revenue** / **Contact 1** / **Contact 2** on one row; **Notes** full width below
2. **Fence / BOM options** — section fields → **Screen SKU (job total LF)** → **Add section** (new section inserts above Screen SKU)
3. **Cost lines** — lodging (amount / facility), freight (company / cost), misc (amount / category)
4. **Materials** — catalog pick or free-text name + qty; **Generate BOM**
5. **Material variance** — signed inventory delta (damaged on site, lost, extra used, returned unused)
6. **Labor** — employee, regular hours, OT (cost uses 1.5× rate). On Site Walk, 0 regular + 0 OT is kept when an employee is selected. Relocate hours are billable; a 0/0 row is dropped.

**Create job** / **Save changes** writes the ticket. Generate BOM does **not** save until you apply and submit.

**Delete job** (edit only) removes the ticket and its material / labor / cost lines. Confirm the dialog; it cannot be undone. For a project that was cancelled, use **Status → Cancelled** instead — Delete is for true mistakes.

**Status** (edit only, Job details): **Active** | **Cancelled**. Create always saves Active — there is no status picker on New job. Changing Active → Cancelled asks you to confirm: “Stays on Jobs and the day list. No inventory or P&L.” Setting Cancelled → Active does not confirm. Cancel does **not** delete materials, labor, or history. Job detail shows a rose banner with the same stay-on-list / no inventory / no P&L copy.

Job list filters (shareable in the URL): from / to date, branch, job type (including Site Walk and Relocate), search (order #, customer, city, address), optional **Hide cancelled** (`hideCancelled=1`). Pagination is 50 per page. There is **no** class filter and **no** separate calendar page. To confirm a day’s tickets, set **From** and **To** to that date and Apply — the table heading **Day list for YYYY-MM-DD** is that confirmation (the banner may call out Site Walk with $0 / no materials, Relocate with no materials, and Cancelled jobs). $0 / blank-materials Site Walk rows and no-materials Relocate rows stay on All types and on that same-day list (type = Install still hides them, same as any other type filter). **Cancelled** jobs stay on the unfiltered Jobs list and the day list with a rose **Cancelled** badge alongside the type badge. Default is to **show** cancelled; check **Hide cancelled** to omit them. There is no separate Cancelled page.

**Export Project** on the detail page downloads an `.xlsx` for poster handoff.

### Generate BOM

Recipes are locked in [BOM_APPROVED.md](./BOM_APPROVED.md). Calculator: fence type + LF + options. **Same quantities for Install and Pickup**; inventory sign is applied later by job type (**Cancelled** overrides to no inventory effect).

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

**Chainlink (CL6 / CL8 / +1):** per section. Wire rolls `CEILING(section LF/50)`; line posts `CEILING(section LF/10)`. **Post mount** is per chainlink section: Driven (bury-length posts) or Plate (fence-height posts + `SCREW-BOLT+ 3/8x3` = `(line×2)+(terminals×4)`). Mixed warehouse/yard = two chainlink sections with the LF split. Aluminum ties `(LF/10)*8` CL6 or `*10` CL8, plus extra ties if top rail. Optional **Top rail** / **Bottom rail**. **Tension wire is not in v1.** Gates and manual terminals are per section. The terminal post kit (posts, tension bars, bands), including a 6′ slide’s extra track posts, is on the BOM only when that section’s fence LF > 0.

**CL6+1 / CL8+1:** full CL base, then barb arms (one per line post), barb wire `CEILING((LF×3)/1320)` rolls, plus 3 tension bands per terminal. Top rail defaults **on** for +1 (overridable).

**Screens:** pick a SKU (`BLACK6`, `BLACK8`, `GREEN6`, `GREEN8`, `ROYAL6`, `NAVY6`, `CUSTOM`) — not Yes/No. Rolls = `CEILING(LF/50)`; zip ties = rolls × 110.

**Gates:** Gate + Gate 2 type/qty. Swing hardware follows Excel. **6′ slides** (`12x6` / `15x6` / `20x6` / `24x6 SLIDE`) use the ALE-30 field recipe. **Slide hardware always shows on Generate BOM:** carrier, rollers, track brackets, gate-frame top rail, and the leaf. The **terminal post kit** (posts, tension bars, bands) emits **only when fence LF > 0**. Qty 1 with LF > 0: **4 / 5 / 6 / 7** terminals for 12 / 15 / 20 / 24. A **gate-only** section (fence type blank or `-`, LF empty) does **not** add that kit. Chainlink **LF 100** with one `24x6 SLIDE` stays **7** terminals, not 14. **8′ slides** stay on Excel-thin math until takeoff — see [BOM_APPROVED.md](./BOM_APPROVED.md) §7. The leaf matches catalog SKUs `24x6-SLIDE` and `12x6-SLIDE` (yards that lacked them were backfilled at on-hand 0). Known catalog gaps `4x6`, `12x8`, `CUSTOM` still emit a **free-text** line and warn; they do **not** create inventory SKUs. `4x8` is not in the dropdown.

Preview Match column:

- **catalog** — linked to a branch inventory item; will move on-hand when you save.
- **free-text** — name only; **inventory will not move.** The app does not invent catalog rows for unmatched BOM names.

Apply replaces material rows (confirm if rows already exist). Then **Create job** / **Save changes**.

### Materials / catalog

Catalog lives **per yard** (SKU unique per branch). The demo load (`npm run db:seed`) puts a few demo items (`PANEL-6`, `BASE-STD`, …) **and** the BOM catalog (`6x10`, `T-STANDS`, `SADDLE CLAMP`, `BIG FEET`, chainlink SKUs, gate bodies, …) on Miami (`MIA`) and Davie (`DAV`). A yard you add in the app gets Davie’s catalog at qty 0 from **Yards** — see [Yards / branches](#yards--branches).

On the job form, the inventory dropdown prefers items for the selected branch. You can still type a free-text name if you leave the catalog pick blank.

Maintain the catalog on **Inv. admin** (`/admin/inventory`): add/edit items, starting qty, unit cost, reusable flag, and **manual adjustments**. Prefer **Deactivate** for SKUs that appear on jobs, transfers, write-offs, or adjustments — hard-delete is blocked when anything still references the item so job history keeps the name. Inactive SKUs stay on past jobs and are hidden from the new-job picker. On-hand uses the same math as `/inventory`.

### Yards / branches

**Yards** (`/admin/branches`) opens **Yards / branches**. Yards you add here show up on jobs, employees, inventory, filters, and analytics. The page says to prefer deactivate — **Remove** when the yard is still referenced — so historical records stay linked. **Show inactive** lists deactivated yards; **Reactivate** turns one back on. **Delete** is only on an inactive yard that nothing references.

**Add yard / branch** takes **Code** and **Name**. Code is stored uppercase and must be unique (for example `DAV`, `MIA`). The helper under the heading says creating a yard copies Davie’s catalog SKUs at qty 0.

**Create** copies the Davie (`DAV`) catalog onto that yard (ALE-38):

- Each new SKU keeps Davie’s name, description, unit, reusable flag, unit cost, and active or inactive state, with **starting qty 0**.
- Davie’s quantities, adjustments, transfers, and job movements stay on Davie.
- The amber note after create is `Created "{code}". Seeded {n} catalog SKU(s) from Davie at qty 0.` When any SKU was already on the yard, that second sentence is `Seeded {n} catalog SKU(s) from Davie at qty 0 ({skipped} SKU(s) already present skipped).`
- **Save changes** on an existing yard updates code, name, or status and leaves catalog rows as stored.

**Seed from Davie** is on every yard whose code is not `DAV`. Davie has **Edit** and **Remove**, and no seed button. The control’s title is “Copy Davie catalog SKUs at qty 0; skip existing.” Confirm reads `Seed "{code}" catalog from Davie? Existing SKUs are skipped; new SKUs start at qty 0.` Cancel leaves the catalog unchanged. Confirm skips SKUs already on that yard (the match ignores letter case) and adds only the missing ones at qty 0. A second run skips those SKUs and leaves stored quantities in place. The note afterward is `"{code}": Seeded {n} catalog SKU(s) from Davie at qty 0.` When any SKUs were already present it is `"{code}": Seeded {n} catalog SKU(s) from Davie at qty 0 ({skipped} SKU(s) already present skipped).`

If Davie is missing, **Create** for any other code stops with `Davie yard (code DAV) was not found. Create or restore Davie before seeding catalogs.` Creating code `DAV` is allowed; the banner reports `Seeded 0` because nothing is copied onto Davie itself.

Opening stock is a later step on **Inv. admin** (starting qty or a manual adjustment). Seeded SKUs are available on that yard’s job catalog pick immediately.

### Inventory (Install vs Pickup)

On-hand =

starting qty + job movements + adjustments + transfers + write-offs + job material variance.

| Job type | Effect on catalog lines |
|----------|-------------------------|
| Install, Drop | **Outbound (−)** — on-hand down (reusable and consumable) |
| Pickup | **Inbound (+)** — on-hand up **only if reusable**. Consumables (`reusable: false`) stay consumed. |
| Other | No inventory effect |
| Site Walk | **No inventory effect** (same as Other; Jobs table Inv. column uses that wording) |
| Relocate | **No inventory effect** (move a section; no stock move; Jobs table Inv. column uses that wording) |
| **Cancelled** (any type) | **No inventory effect** — overrides Install / Pickup / Drop / Other / Site Walk / Relocate; on-hand does not change; materials stay on the ticket. Jobs table **Inv.** uses that wording. |

BOM quantities are the same for Install and Pickup. The inventory sign is separate; **Cancelled** forces no movement regardless of type; consumables never restock.

Free-text material lines do not move stock. Damage / missing on a pickup is **variance** or a **write-off**, not extra Pickup credit.

Transfers (`/transfers`): from yard → to yard; destination SKU is created if missing (starting qty 0). Write-offs (`/write-offs`): damaged / scrap / shrink. Both change on-hand; both are excluded from job analytics.

### P&L

**P&L** (`/pnl`): enter or click an order number → **Look up**. Active tickets sharing that order roll up. **Cancelled** tickets are excluded from revenue, labor, materials, lodging/freight/misc, and variance (a cancelled sibling on the same order # is ignored). If every ticket on the order is Cancelled, lookup shows the cancelled-excluded empty state.

Shown: revenue, labor (OT @ 1.5×; Site Walk 0-hr labor is $0; Relocate hours and revenue count), material cost (catalog unit cost × qty on **Install / Drop** only; Pickup BOM is a warehouse return, not a second cost; Other / Site Walk / Relocate excluded; free-text = $0), lodging, freight, misc, material variance, total cost, gross profit.

Yard expenses are a separate ledger (`/expenses`) and are **not** forced onto job P&L.

**Analytics** (`/analytics`): monthly LF by branch and job-type group (Install / Drop vs Pickup vs Other; Site Walk and Relocate group with Other), plus job count, install/drop LF, pickup LF, revenue, rough labor. Job tickets only — not transfers or write-offs. Cancelled tickets are excluded.

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
