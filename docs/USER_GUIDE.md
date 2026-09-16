# Temp Fence Ops — User / Operator Guide

For office users (including Alex). This is how to use the **live Hardpoint demo**, not a developer setup guide.

Live app: [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app)

---

## 1. What this software is

Temp Fence Ops is a daily operations tracker for **temporary fence install and pickup** (events and construction). It replaces the slow Excel workbooks for:

- Daily job tickets (order #, site, materials, labor, extra costs)
- Inventory on-hand by yard
- Order P&L (revenue vs labor / materials / extras)

The public Hardpoint deploy is a **demo with fake sample data** (Miami and Davie yards). It is not a private company system and is not loaded with real customer or payroll records.

---

## 2. Access

| | |
|--|--|
| **URL** | [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app) |
| **Sign-in** | Unauthenticated visits redirect to **Sign in**. After login you land on the dashboard. |

### Demo logins (demo-only)

| Email | Password | Role on the user record |
|-------|----------|-------------------------|
| `admin@demo.local` | `DemoAdmin123!` | admin |
| `office@demo.local` | `DemoOffice123!` | office |

**Warning: demo-only.** These passwords are public. Do not use them for a real company deploy, and do not put real jobs, inventory, or employee data behind them. In this public demo both accounts can use the same screens (including Admin); the role is stored on the user but the app does not currently hide Admin from office users.

Your name appears at the top right. **Log out** is next to it. Sessions last about 14 days unless you log out.

The header shows a small **demo** badge so it is obvious this is not a production company site.

---

## 3. Navigation

After sign-in, the top bar has two groups.

**Main**

| Link | What it is for |
|------|----------------|
| **Dashboard** | Snapshot: job count, yards, employees, booked revenue, recent jobs, inventory that is below starting qty |
| **Jobs** | Daily work tickets — list, filter, create, edit, delete, Generate BOM, Export Project |
| **Inventory** | On-hand by yard (computed from starting qty plus all movements) |
| **Transfers** | Move quantity from one yard to another |
| **Write-offs** | Damaged / scrap / shrink — reduces on-hand, not a job ticket |
| **Yard expenses** | Yard spend ledger (PPE, tools, food, etc.) — not forced onto jobs |
| **P&L** | Look up profit/loss **by order number** (install + pickup on the same order roll up together) |
| **Analytics** | Monthly linear-feet by yard and job type (install vs pickup vs other) |

**Admin** (same bar, after a divider)

| Link | What it is for |
|------|----------------|
| **Yards** | Add / edit / deactivate yards (branches) |
| **Vendors** | Supplier list used on yard expenses |
| **Employees** | Crew used on job labor lines (name, rate, position, yard) |
| **Inv. admin** | Inventory catalog per yard + manual qty adjustments |
| **Import** | CSV import of daily-tracker rows into Jobs |

On a phone or tablet the links wrap. Tables are easier in landscape.

---

## 4. Core workflows

### Dashboard

Open [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app) after sign-in.

- Cards jump to Jobs, Inventory, or P&L.
- **Recent jobs** links into each ticket.
- **Inventory attention** lists items whose on-hand is under 85% of starting qty (up to five).

The dashboard still shows an older “phase status” note at the bottom. Treat that as historical; the screens in this guide are what the app actually has.

### Jobs — find a ticket

**Jobs** (`/jobs`) is the daily list.

- **New job** (blue button) opens the create form.
- Filters: date **From** / **To**, **Branch**, **Job type**, **Search** (order #, customer, city, address). Apply, or **Clear filters**.
- Filters live in the URL, so you can bookmark or share a view.
- 50 jobs per page.
- Columns include date, order #, type, yard, customer, city, inventory direction (Outbound / Inbound / none), revenue, and material/labor line counts.
- Click the **order #** for the detail page, or **Edit** to change the ticket.

Demo sample orders include `ORD-1001` (install + pickup), `ORD-2044` (install), and `ORD-1105` (delivery).

### Create or edit a job

**Create:** Jobs → **New job** (`/jobs/new`).  
**Edit:** job detail → **Edit job**, or **Edit** on the list.

Required fields: **Order #**, **Date**, **Branch**, **Job type**.

The form is one long page with these sections, top to bottom:

1. **Job details** — order #, date, yard, job type (`INST`, `PU`, `DELIVERY`, …), class (`EVENT` / `CONSTRUCTION` / `OTHER`), customer, address, city, account exec, revenue, notes.
2. **Fence / BOM options** — fence type, LF, rails, weights, screen SKU, gates, manual terminals (see [§5](#5-bom-fence-types-and-options)).
3. **Cost lines** — lodging (amount / hotel), freight (company / cost), misc (amount / category). Empty rows are skipped. These feed order P&L; they do not move inventory.
4. **Materials** — catalog pick (filtered to the selected yard when possible) or a free-text name, qty, notes. **Generate BOM** lives here.
5. **Material variance** — signed inventory delta on this job (damaged on site, lost, extra used, returned unused). Negative qty leaves the yard; positive qty is unused material returned. This also hits P&L as variance cost.
6. **Labor** — employee, regular hours, OT hours. Same-yard crew is listed first. P&L costs OT at 1.5× the hourly rate.

Buttons at the bottom:

- **Create job** or **Save changes** — this is when the ticket (and inventory effect) is actually stored.
- **Cancel** — back without saving.
- **Delete job** (edit only) — asks for confirmation; deletes the ticket and its lines. Cannot be undone.

**Job type vs inventory** (catalog lines only; free-text names do **not** move on-hand):

| Job type | On-hand |
|----------|---------|
| `INST`, `INSTALL`, `DELIVERY`, `DEL`, `DROP` | Decreases (material left the yard) |
| `PU`, `PICKUP`, `RETURN`, `RET` | Increases (material came back) |
| `OTHER` and anything else | No inventory effect |

Install and pickup can share the same **order number**. That is how P&L rolls a job pair into one order.

### Generate BOM (preview, then apply)

BOM is a **suggested material list** from fence type + linear feet + options. It does not save by itself.

1. Fill **Fence / BOM options** (type, LF, rails/weights/screen/gates/terminals as needed).
2. In **Materials**, click **Generate BOM**.
3. A **BOM preview** appears: each item, qty, and whether it matched the yard catalog (`catalog`) or will be free-text. Warnings (unknown type, catalog gaps, unmatched names) show in amber.
4. Review the preview. **Apply to materials** copies those lines into the material rows. If you already have real material lines, the app asks to confirm replace. **Dismiss** closes the preview without changing rows.
5. Edit rows if the crew will actually pull different qty, then **Create job** / **Save changes**.

Notes that matter in the field:

- Preview is not saved. If you navigate away before apply + save, the suggestion is gone.
- Apply **replaces** the material list; it does not merge with existing rows.
- **INST and PU use the same quantities.** Pickup does not invert the BOM. Inventory sign still follows job type (install down, pickup up).
- Catalog match uses the **selected yard**. Pick the branch first so SKUs can link and move on-hand.
- Free-text / unmatched lines still show on the ticket and in Export, but they do **not** change inventory and they cost **$0** on P&L.

You can always skip Generate BOM and type or pick material rows by hand.

### Job detail and Export Project

The detail page (`/jobs/…`) is the read-only ticket: site, fence options, cost lines, materials (with inventory delta), variance, labor, and a link to **P&L for that order**.

**Export Project** downloads an Excel `.xlsx` for poster / office handoff (`Project_<order>_<date>_<yard>.xlsx`). Sheets:

- Summary (order, site, type, LF, fence, rails, gates, screen, terminals, revenue, notes)
- Materials
- Labor (with OT cost)
- Cost lines
- Material variance (only if the job has variance rows)

### Inventory basics

**Inventory** (`/inventory`) is the on-hand board, not the catalog editor.

Filter chips: **All**, or a yard (`MIA - Miami Yard`, `DAV - Davie Yard` in the demo).

Each row shows starting qty, then movements:

| Column | Meaning |
|--------|---------|
| **Jobs** | Signed material qty from job tickets |
| **Adj** | Manual adjustments (Inv. admin) |
| **Xfer** | Net transfers in/out of this yard |
| **W/O** | Write-offs (shown as a reduction) |
| **Var** | Job material variance |
| **On hand** | Starting + all of the above |
| **Unit cost** | Catalog cost used on P&L (not a sell price) |

**Manage catalog / adjustments** jumps to **Inv. admin**.

How on-hand actually changes:

- Start from each SKU’s **starting qty** for that yard.
- Job materials: install/delivery **down**, pickup/return **up**.
- Transfers: from-yard **down**, to-yard **up**.
- Write-offs: **down**.
- Job variance: whatever signed qty you entered.
- Manual adjustment: positive adds, negative removes.

Only **catalog** items move these numbers. Always pick a SKU on the job when you want the board to stay true.

### Transfers

**Transfers** (`/transfers`): from yard → to yard, one or more lines (item + qty). Destination gets a matching SKU if it did not exist (starting qty 0, unit cost copied). Recent transfers are listed; delete reverses inventory. Transfers are **not** in job P&L or analytics.

### Write-offs

**Write-offs** (`/write-offs`): yard, item, qty, reason (`damaged` / `scrap` / `shrink`), date, notes. Reduces on-hand. Use this for yard damage/shrink, not for “we used extra on the job” (that belongs on **Material variance** on the ticket). Also excluded from job analytics.

### Yard expenses

**Yard expenses** (`/expenses`): date, yard, category (`PPE`, `Consumables`, `Tools`, `Food`, `Equipment`, `Other`), vendor (from the vendor list or free text), amount, purchased by, notes. This is a yard ledger. It is **not** added to a job’s P&L unless you also put a misc/freight/lodging line on the ticket.

### P&L by order #

**P&L** (`/pnl`): type or click an order number (demo chips include the seeded orders). All tickets sharing that order # roll up:

- Revenue
- Labor (rate × hours; OT at 1.5×)
- Material cost (catalog unit cost × qty; free-text = $0)
- Lodging / freight / misc
- Material variance cost
- Total cost and **gross profit**

Transfers, write-offs, and yard expenses are **not** in this rollup. Open any ticket from the table under the totals.

### Analytics

**Analytics** (`/analytics`): monthly LF from job tickets only.

Filters: **Year**, **Branch**, **Job type group** (all / INST-install-delivery / PU-pickup-return / Other).

Cards: jobs, install/delivery LF, pickup/return LF, revenue, rough labor cost. Below that: a monthly LF chart and a branch × job-type table. Transfers and write-offs do not appear here.

### Admin (setup you will touch)

- **Yards** — code + name (demo: `MIA`, `DAV`). Prefer deactivate over delete if the yard already has jobs.
- **Vendors** — name, optional notes; used on yard expenses.
- **Employees** — name, name key, hourly rate, position, yard. Prefer deactivate so old labor lines stay linked. No SSN, DOB, address, or personal email in this app.
- **Inv. admin** — add/edit catalog SKUs per yard (SKU, name, unit, reusable, starting qty, unit cost) and **manual inventory adjustment** (positive or negative qty + reason). Same on-hand math as Inventory.
- **Import** — upload a Daily Tracker CSV, **dry-run / preview**, then commit. Matching key is **order number + date**. See [IMPORT.md](IMPORT.md) for columns. Wide Excel material grids do not import automatically.

---

## 5. BOM fence types and options

The **Fence / BOM options** block on create/edit drives Generate BOM. Only these **canonical** fence types are calculated. Other labels import as empty BOM plus a warning.

| Code | Meaning |
|------|---------|
| `CL6` | 6′ chainlink |
| `CL8` | 8′ chainlink |
| `CL6+1` | 6′ chainlink + 3-strand barb |
| `CL8+1` | 8′ chainlink + 3-strand barb |
| `6x10` / `6x12` / `8x10` / `8x12` | Panels |
| `BARRICADE` | Bike barricade |

**Options you will actually click in the UI**

| Option | When it shows | What it does (plain language) |
|--------|----------------|-------------------------------|
| **Qty (LF)** | Always | Run length. All recipes start from this. |
| **Top rail** / **Bottom rail** | Chainlink types | Extra 1-3/8″ tube, caps/clamps, rail ends at terminals. Off by default on plain CL; **top rail turns on automatically** when you pick `CL6+1` or `CL8+1` (you can still uncheck it). |
| **Weights (panels)** | Panel types | `BFOOT` (big feet) or `SBAG` (sand bags) — two per T-stand. |
| **Screen SKU** | Always | Pick a color/size (`BLACK6`, `GREEN8`, …). Not a Yes/No. `CUSTOM` is a known catalog gap (BOM line may be free-text). |
| **Gate** / **Gate 2** + qty | Always | Swing or slide bodies plus hardware. Qty also adds **2 terminals per gate**. |
| **Manual terminals** | Chainlink | Corners, start/stop, extras. Auto terminals = gate qty × 2. |

**Not in the app (v1):** tension wire — do not expect a toggle or BOM lines for it.

**High-level recipes** (enough to sanity-check a preview; not the formulas):

- **Panels** — panels from LF ÷ width; T-stands = panels + 1; saddle clamps = panels − 1; optional feet/bags.
- **Barricade** — pieces from LF ÷ 7.
- **Chainlink** — wire rolls, line posts (~every 10′), ties, terminal posts/hardware from gate + manual terminals. `+1` adds barb arms on line posts, three strands of barb, and extra tension bands at terminals.
- **Screens** — rolls from LF ÷ 50, plus zip ties.
- **Gates** — body SKU plus swing or slide hardware.

Exact counts, SKU names, and edge cases (slide track brackets, rail-end bolts, 1,320′ barb rolls, known gaps like `4x6` / `12x8`) live in **[BOM_APPROVED.md](BOM_APPROVED.md)**. That file is the locked math. This guide does not replace it.

---

## 6. Known limits

This Hardpoint deploy is a **public demo**, not a finished company production system.

| Limit | What it means for you |
|-------|------------------------|
| **Vercel Hobby** | Hosted on the Hardpoint Vercel Hobby plan. Fine for trying the product; not sized or contracted as a private ops host. Occasional cold starts are normal. |
| **Sample data only** | Fake Miami (`MIA`) / Davie (`DAV`) yards, fictional crew, fake SKUs and jobs. Employee records are name / rate / position / yard only. |
| **No custom domain** | The live URL is `temp-fence-ops.vercel.app`. There is no company hostname on this deploy. |
| **Public demo logins** | Anyone with the README can sign in. Treat everything here as disposable. |
| **Not a private company copy** | Real jobs and inventory belong in a private deploy with new users and a strong secret. See [PRIVATE_DEPLOY.md](PRIVATE_DEPLOY.md). |
| **BOM / catalog gaps** | Tension wire is out of scope. Some gate sizes (`4x6`, `12x8`) and `CUSTOM` screen have no inventory SKU; Generate BOM may warn and emit free-text. |
| **Cost engine** | Unit cost on the catalog is a simple number. Purchases, landed cost, and true average cost are not built yet. Transfer “carry cost” is not calculated. |
| **P&L scope** | Order P&L is job tickets only. Yard expenses, transfers, and write-offs stay on their own screens. |
| **Roles** | `admin` vs `office` is stored but not used to lock screens in this demo. |
| **Desktop-first** | Usable on tablet; wide tables (Jobs, Inventory, Analytics) are happier in landscape. |

If something in the UI disagrees with Excel, the locked BOM file wins for fence math: [BOM_APPROVED.md](BOM_APPROVED.md).

---

## Related docs

| Doc | Audience |
|-----|----------|
| [USER_GUIDE.md](USER_GUIDE.md) (this file) | Operators |
| [BOM_APPROVED.md](BOM_APPROVED.md) | BOM math (locked) |
| [IMPORT.md](IMPORT.md) | CSV import from Excel |
| [DATA_MODEL.md](DATA_MODEL.md) | Tables and inventory/P&L rules |
| [PRIVATE_DEPLOY.md](PRIVATE_DEPLOY.md) | Private company hosting |
| [BUILD_PLAN.md](BUILD_PLAN.md) | What shipped in each wave |
| [README.md](../README.md) | Engineers: local run, stack, scripts |
