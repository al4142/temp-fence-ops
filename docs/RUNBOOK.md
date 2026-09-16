# Runbook — Temp Fence Ops (Hardpoint)

Operations notes for the **live public demo**. Not a company cutover guide (that is [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md)). Operators use [USER_GUIDE.md](./USER_GUIDE.md). Engineers use the [README](../README.md) to run locally.

---

## Production URL(s)

| What | URL |
|------|-----|
| **Production** | [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app) |
| Unauthenticated | Redirects to `/login` |
| GitHub | [https://github.com/al4142/temp-fence-ops](https://github.com/al4142/temp-fence-ops) |

There is **no custom domain**. Product name in the UI is **Temp Fence Ops** (amber **demo** badge).

Vercel may also issue **preview** URLs for pull requests. Those are not production. Prefer `temp-fence-ops.vercel.app` for smoke checks.

---

## Environments

| Layer | This demo |
|-------|-----------|
| App host | **Vercel** team **HARDPOINT** (`hardpoint1`), **Hobby** plan |
| Database | **Neon Postgres** (`DATABASE_URL`) |
| Git | `main` on `al4142/temp-fence-ops` |
| CI | **None** — no `.github` workflows. Deploy is the Vercel Git integration. |

Expect demo-scale traffic, possible **cold starts**, and no production SLA. Local Docker Postgres (or a Neon branch) is for development only — see the README.

Hobby + Neon Free/demo is the intended hosting for this public sample. Do not treat this URL as a place to store real client jobs or inventory.

---

## Required env vars

Set in the Vercel project (Production). **Never commit secrets.** Template: `.env.example`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Prisma `provider` is `postgresql` (SQLite URLs fail). |
| `AUTH_SECRET` | Yes | HMAC secret for the `tfo_session` cookie. Must be a long random string (**≥ 16** characters; generate with `openssl rand -base64 32`). |
| `NODE_ENV` | Host sets | `production` turns on `Secure` cookies. |

This app uses **one** `DATABASE_URL` (no separate `DIRECT_URL`).

- **`prisma migrate deploy` needs the Neon direct (non-pooler) URL** — host typically `ep-….neon.tech`, not `ep-…-pooler.neon.tech`. Include `sslmode=require` as Neon shows in the console.
- Runtime can use that same direct URL. A pooled URL is only viable if you later split env vars; do not point migrations at the pooler.

`NEXTAUTH_SECRET` is unused (this is not Auth.js).

Confirm names only in the Vercel / Neon consoles — do not paste connection strings or `AUTH_SECRET` into tickets, PRs, or chat.

---

## Deploy path

```
git push / merge to main
        → Vercel Git integration
        → prisma generate && next build  (npm run build)
        → production: https://temp-fence-ops.vercel.app
```

1. Open a PR against `main`. There is no GitHub Actions check suite.
2. Merge to `main`. Vercel builds from that commit.
3. Watch the deployment in the Vercel dashboard (HARDPOINT team, this project).
4. If the commit includes a **new Prisma migration**, apply it on Neon **before or immediately after** the app that depends on it is live — see next section. A schema change that the new code requires will 500 until `migrate deploy` has run.

Build already includes `prisma generate` (`postinstall` and `npm run build`). Do not run `npm run db:seed` as part of deploy.

Private-repo / real-data hosting notes (fork, real users, strip demo): [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md).

---

## Migrate on Neon

Schema only. Use the **direct / non-pooler** connection string.

From a trusted machine (or a one-off with production env), never against leftover SQLite `dev.db`:

```bash
# DATABASE_URL = Neon direct URL (sslmode=require)
npx prisma migrate deploy
```

Current history is a **single PostgreSQL baseline**: `prisma/migrations/20260916220000_init_postgresql`. That baseline is what a fresh Neon database needs. Do not run `prisma migrate reset` or `npm run db:reset` on the demo database if anyone is using it — those wipe data and re-seed.

If migrate fails with pooler / prepared-statement errors, switch `DATABASE_URL` to the **direct** endpoint and retry.

---

## Seed policy

`npm run db:seed` (`prisma/seed.ts`) **deletes existing rows** (users, jobs, inventory, transfers, …) and loads fake Miami (`MIA`) / Davie (`DAV`) sample data plus demo logins.

| Environment | Seed? |
|-------------|--------|
| Local / throwaway Neon branch | Yes — that is what seed is for |
| This public Hardpoint demo | Only if you **intend** to wipe and restore the sample dataset |
| Any database with **real client jobs, inventory, or employees** | **Never** |

Demo logins created by seed (public, demo-only):

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.local` | `DemoAdmin123!` | admin |
| `office@demo.local` | `DemoOffice123!` | office |

Do not use these passwords on a company deploy. Create real users and a unique `AUTH_SECRET` — [PRIVATE_DEPLOY.md](./PRIVATE_DEPLOY.md) §5.

---

## Smoke checks

After a production deploy (or when the demo looks wrong), walk this on [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app):

1. **Login** — `admin@demo.local` / `DemoAdmin123!`. You should land on the dashboard. Header shows **Temp Fence Ops** + demo badge and Admin links (Yards, Vendors, Employees, Inv. admin, Import). Role is stored but **not** used to hide Admin.
2. **Jobs → New job** — pick Miami or Davie (both have the BOM catalog after seed).
3. **Generate BOM** — fence type `6x10`, Qty (LF) `400`, Weights `BFOOT`. Click **Generate BOM**.

Expected preview (**40 / 41 / 39 / 82** plus bolts):

| Item | Qty |
|------|-----|
| 6x10 | **40** |
| T-STANDS | **41** |
| SADDLE CLAMPS | **39** |
| CB5/16x2-1/2 | 39 |
| BIG FEET | **82** |

Math: `n = CEIL(400/10)` → panels `n`, stands `n+1`, clamps/bolts `n−1`, big feet `stands × 2`. Locked recipes: [BOM_APPROVED.md](./BOM_APPROVED.md). Unit test: `src/lib/bom/calculate.test.ts`.

4. Match column should be **catalog** on a seeded yard (not free-text).
5. Optional: **Apply to materials** (do not save a junk ticket on the shared demo unless you mean to). **P&L** lookup by a known seed order (`ORD-1001`, `ORD-2044`, `ORD-1105`) should return a rollup.

If login works but BOM qtys differ, the calculator or catalog changed — check that PR before blaming Vercel/Neon.

---

## Common failures

| Symptom | Likely cause | What to try |
|---------|--------------|-------------|
| Redirect loop / cannot stay signed in | Missing or short `AUTH_SECRET` (under 16 characters); cookie `Secure` on non-HTTPS | Set a long `AUTH_SECRET` in Vercel, redeploy. Production must be HTTPS (it is on `*.vercel.app`). |
| `Invalid email or password` | Seed never run, or seed wiped users | Confirm demo users exist. Re-seed **only** if wiping the demo DB is acceptable. |
| Prisma / `P1001` / connection errors | Bad `DATABASE_URL`, Neon compute asleep then fail, or SQLite URL left over | Check Neon dashboard (endpoint running). Use a Postgres URL with `sslmode=require`. |
| `migrate deploy` fails on pooler | Pooled Neon host | Use the **direct** (non-pooler) URL. |
| App 500s after a schema PR | Migration not applied on Neon | `npx prisma migrate deploy` with the direct URL. |
| Generate BOM warns / free-text lines | Legacy fence type (`6ft Panel` on seed jobs) or catalog gap | Use canonical types (`6x10`, `CL6`, …). Gaps `4x6` / `12x8` / `CUSTOM` are known. |
| Empty catalog / BOM Match not catalog | Seed catalog missing on that yard | Seed loads BOM SKUs on MIA and DAV only. |
| Hobby timeouts / slow first request | Cold start | Retry once. Not an SLA. |
| Real-looking client data on this URL | Someone used the public demo as prod | Stop. This database is a **demo**. Move real ops to a private deploy; rotate `AUTH_SECRET`; do not seed real data here. |

---

## Rollback

- **App (Vercel):** in the HARDPOINT project, use **Instant Rollback** (or promote a previous production deployment) to the last known-good `main` deploy. That restores the Next.js build only — it does **not** undo Neon data or migrations.
- **Git:** revert the bad commit on `main` and let Vercel redeploy.
- **Schema:** do **not** `migrate reset` on Neon. This repo’s first migration is a baseline; a bad *new* migration needs a follow-up forward migration or a Neon backup/branch restore, not a local `db:reset`.
- **Data:** there is no in-app undo for deleted jobs. Seed is a full wipe + sample reload — demo-only.

If rollback and the new code required a migration that already ran, rolling the app back without a matching schema can also 500. Prefer forward fixes for Prisma changes.

---

## Who to ping (Hardpoint, light touch)

Keep it short; this is a Hobby demo.

| Who | When |
|-----|------|
| **Alex** (owner) | Product call, merge to `main`, “is the demo the source of truth?” |
| **Lance** (CTO) | Architecture / BOM / this docs set (tech spec, README, runbook) |
| **Pritpal** | Vercel project, Hobby, Neon URL / migrate / env |
| **Sam** | Doc accuracy skim when a docs PR lands |

Linear (BOM Ship): [ALE-12](https://linear.app/al5421/issue/ALE-12/docs-tech-spec-system-design) tech spec, [ALE-13](https://linear.app/al5421/issue/ALE-13/docs-readme-polish-clonerunenv) README, [ALE-14](https://linear.app/al5421/issue/ALE-14/docs-runbook-deployincidentsenv) this runbook. Operator guide: [ALE-11](https://linear.app/al5421/issue/ALE-11/docs-operators-guide-user_guidemd) / [PR #5](https://github.com/al4142/temp-fence-ops/pull/5).
