# Runbook — Temp Fence Ops

Operations notes for the **live demo** on Hardpoint’s Vercel Hobby team: deploy, environment, migrations, smoke checks, and common failures.

Office usage: [USER_GUIDE.md](./USER_GUIDE.md). Architecture: [TECH_SPEC.md](./TECH_SPEC.md). Forking for real company data: [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md).

This is a **public demo**, not a production SLA.

---

## 1. Production URL(s)

| URL | Role |
|-----|------|
| [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app) | Production / live demo |
| [https://github.com/al4142/temp-fence-ops](https://github.com/al4142/temp-fence-ops) | Source repo |

No custom domain. Preview deployments may exist on Vercel for PRs; treat **temp-fence-ops.vercel.app** as the canonical production hostname.

Unauthenticated visits redirect to **Sign in**.

---

## 2. Environments

| Piece | Value |
|-------|--------|
| **App name in UI** | Temp Fence Ops (amber **demo** badge) |
| **Vercel** | Team **Hardpoint** (`hardpoint1`), **Hobby** plan |
| **Git integration** | Push / merge to `main` → Vercel production deploy. This repo has **no** `.github` workflows. |
| **Database** | Neon Postgres (demo/free tier) |
| **Local** | Docker Postgres 16 (or a Neon branch) + `npm run dev` — see README |

Expect demo-scale traffic and possible **cold starts** on Hobby. Do not store real client or HR data here.

---

## 3. Required environment variables

Set in Vercel project env (Production) and in local `.env`. **Never commit secrets.** Template: `.env.example`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Prisma `datasource` uses this one URL. |
| `AUTH_SECRET` | Yes | HMAC secret for the signed `tfo_session` cookie. Must be a long random string (**≥ 16 characters**). Generate: `openssl rand -base64 32` |
| `NODE_ENV` | Host sets | `production` on Vercel enables `Secure` cookies. Do not set this yourself in Vercel unless you know you need to. |

`NEXTAUTH_SECRET` is **not** used (no Auth.js).

### `DATABASE_URL`: direct vs pooled

The app currently uses **one** `DATABASE_URL` (runtime and Prisma). Neon exposes:

- **Direct** (non-pooler) — typically host like `ep-….neon.tech`, often with `sslmode=require`
- **Pooled** (PgBouncer) — typically a `-pooler` host

**`prisma migrate deploy` must use the direct (non-pooler) URL.** Prisma migrations open connections in a way that breaks on transaction-mode poolers.

Runtime *can* use a pooled URL if you later split env vars; this codebase does not. For the live demo, keep `DATABASE_URL` on the **direct** URL so migrate and the app agree.

Local Docker example (from `.env.example`):

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/temp_fence_ops?schema=public"
```

---

## 4. Deploy path

```
git push / merge to main  →  Vercel Git integration  →  build  →  temp-fence-ops.vercel.app
```

Build command (already `npm run build`):

```bash
prisma generate && prisma migrate deploy && next build
```

`postinstall` also runs `prisma generate`.

**Preview and production builds run `prisma migrate deploy`** so Neon gets new columns before the new Prisma client serves traffic. `DATABASE_URL` on Vercel must be the **direct** (non-pooler) Neon URL — migrate fails on transaction-mode poolers ([§5](#5-migrate-on-neon)).

**Job contacts (ALE-37):** `prisma/migrations/20260922101500_job_contacts` adds nullable `Job.contact1` and `Job.contact2` (`TEXT`). After that change is on `main`, **Production needs `prisma migrate deploy`**. The Vercel production build runs it when `DATABASE_URL` is the direct Neon URL. If the build skipped migrate or failed before it, **Pritpal** runs `npx prisma migrate deploy` against Production Neon with the direct URL ([§5](#5-migrate-on-neon)). Existing job rows are unchanged (new columns stay NULL). A save error on Contact 1 / Contact 2 means this migration has not been applied.

If a preview still boots against a DB that is missing `fenceSections` / `postMount`, Job reads fall back to the legacy one-section columns so the jobs list, New Job, and Edit Job pages do not 500.

If you need to apply migrations off-Vercel (local, one-off, or a failed build):

1. Confirm the deploy is green (or fix the build first).
2. Run `npx prisma migrate deploy` against Neon using the **direct** URL ([§5](#5-migrate-on-neon)).
3. Smoke-check the live app ([§7](#7-smoke-checks)).

Rollback of the **app**: Vercel dashboard → Deployments → promote / rollback the previous successful deployment. Rollback of the **schema**: restore the Neon branch / backup. Checked-in SQL under `prisma/migrations/` applies in timestamp order, starting from baseline `20260916220000_init_postgresql` and including later migrations such as `20260922101500_job_contacts`. There is no down-migration workflow.

---

## 5. Migrate on Neon

Use the **direct** (non-pooler) connection string.

From a trusted machine (or a one-off command runner) with production `DATABASE_URL` set:

```bash
npx prisma migrate deploy
```

That applies checked-in SQL under `prisma/migrations/` only, including `20260922101500_job_contacts` (`Job.contact1` / `Job.contact2`). It does **not** load seed data. Production (Pritpal: Neon on the Hardpoint Vercel project) must run this after a deploy that adds columns, if the build did not already apply it.

Do **not** run `prisma migrate dev` against production (that is for local schema development). Do **not** point `DATABASE_URL` at a leftover SQLite `dev.db`.

---

## 6. Seed policy

| Context | Policy |
|---------|--------|
| **Local / this public demo** | `npm run db:seed` (or `db:reset`) loads fake Miami (`MIA`) / Davie (`DAV`) yards, sample jobs, BOM catalog, and demo logins. |
| **Real prod / real client data** | **Never seed.** Migrate schema only. Create real users. Rotate `AUTH_SECRET`. Delete leftover `admin@demo.local` / `office@demo.local`. See [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md). |

`prisma/seed.ts` **deletes existing rows** (users, jobs, inventory, …) then inserts sample data. Running it against a database with real tickets **wipes that data**.

Live demo credentials (public, demo-only):

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.local` | `DemoAdmin123!` | admin |
| `office@demo.local` | `DemoOffice123!` | office |

Anyone with the URL can sign in. Do not put real client jobs or inventory on this database.

---

## 7. Smoke checks

After deploy or migrate, on [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app):

1. **Login** — `admin@demo.local` / `DemoAdmin123!`. Header shows **Temp Fence Ops** + **demo** badge and the signed-in name.
2. **Jobs → New job** — pick Miami or Davie.
3. **Generate BOM** — fence type `6x10`, Qty (LF) `400`, Weights `BFOOT`. Click **Generate BOM**.

Expected preview (approved panel math):

| Item | Qty |
|------|-----|
| 6x10 | **40** |
| T-STANDS | **41** |
| SADDLE CLAMPS | **39** |
| CB5/16x2-1/2 | **39** |
| BIG FEET | **82** |

Shorthand: **6x10 / 400 LF / BFOOT → 40 / 41 / 39 / 82**.

4. Optional: **Apply to materials** → **Create job** → open **Inventory** (catalog lines moved) → **P&L** look up the order #.
5. **Job contacts** — on **New job**, **Revenue**, **Contact 1**, and **Contact 2** share one row and **Notes** is full width below. A blank contact still saves. Fill both, save, reopen **Edit job**, and confirm they persisted. A Prisma error naming `contact1` / `contact2` means `20260922101500_job_contacts` did not apply — run `npx prisma migrate deploy` ([§5](#5-migrate-on-neon)).
6. **Log out** from the header.

If login fails, check `AUTH_SECRET` and that demo users exist (seeded demo DB only). If Generate BOM quantities differ, the live calculator or catalog drifted from [BOM_APPROVED.md](./BOM_APPROVED.md) — see `src/lib/bom/` and `npm test`.

---

## 8. Common failures / rollback

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| Redirect loop / cannot sign in | `AUTH_SECRET` missing, changed, or shorter than 16 characters | Set a long secret in Vercel; redeploy. Changing the secret invalidates existing cookies (users sign in again). |
| `AUTH_SECRET is missing or too short` in logs | Same | `.env` / Vercel env not loaded. |
| Prisma / migrate errors about PgBouncer or prepared statements | Pooled Neon URL used for `migrate deploy` | Switch to the **direct** (non-pooler) URL. |
| `P1001` / can’t reach database | Wrong host, IP allow list, or Neon project asleep/deleted | Check Neon console + `DATABASE_URL`. Hobby/free may cold-start. |
| Build fails on Prisma engine | `prisma generate` did not run | Confirm `postinstall` / `npm run build` still include generate. |
| Empty app / no demo logins | DB migrated but never seeded, or seed was skipped | Demo only: `npm run db:seed`. **Do not seed a real client DB.** |
| Demo data vanished | Someone ran `db:seed` / `db:reset` against Neon | Restore Neon; treat seed as destructive. |
| Admin screens visible to `office@` | Expected | Role is stored; Admin nav is **not** hidden. See [TECH_SPEC.md](./TECH_SPEC.md) §7. |
| Generate BOM warns on seed jobs | Seed fence type `6ft Panel` is legacy | Use a canonical type (`6x10`, `CL6`, …). |
| Hobby 404 / spin-up delay | Cold start | Retry; not an SLA. |
| SQLite / `file:./dev.db` errors | Old local env | Provider is `postgresql` only. Point `DATABASE_URL` at Postgres and migrate a **fresh** database. |

**App rollback:** Vercel → previous production deployment.

**Data rollback:** Neon backup / branch restore. There is no automated migrate-down.

**Incident hygiene:** rotate `AUTH_SECRET` if it leaked in a non-demo context; demo passwords are already public. Do not paste production connection strings into tickets or chat.

---

## 9. Who to ping (Hardpoint)

Light-touch — roles, not a paging roster:

| Topic | Who |
|-------|-----|
| Product / owner, sample data, BOM product calls | **Alex** |
| Engineering / this codebase | **Lance** (CTO) |
| Vercel Hobby (`hardpoint1`), Neon URL, env in the host | **Pritpal** |
| Doc accuracy skim | **Sam** |

Private-company cutover (real users, no demo seed) is **not** this runbook — use [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md) and treat it as a separate deploy.
