# Temp Fence Ops

Public demo of an operations tracker for temporary-fence install and pickup work (events and construction). It replaces a slow Excel workbook covering daily jobs, inventory by yard, and P&L by order number, with a locked **Generate BOM** calculator on the job form. The live app is [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app) (Hardpoint Vercel Hobby + Neon). **This repository uses fake sample data only** — employee records are name, hourly rate, position, and branch (no SSN, DOB, address, phone, or personal email).

| Doc | Audience |
|-----|----------|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Office / admin — how to use the live app |
| [docs/TECH_SPEC.md](docs/TECH_SPEC.md) | Engineering — architecture and system design |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Ops — deploy, env, migrate, incidents |
| [docs/BOM_APPROVED.md](docs/BOM_APPROVED.md) | Locked BOM recipes (calculator source of truth) |

This README is **developer setup**, not a replacement for the Operator’s Guide.

---

## Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL 14+** — local Docker (example below) or a Neon branch
- Git

Prisma `provider` is `postgresql`. SQLite (`file:./dev.db`) is not supported.

## Clone

```bash
git clone https://github.com/al4142/temp-fence-ops.git
cd temp-fence-ops
npm install
cp .env.example .env
```

Edit `.env` before migrate/seed/dev.

## Environment variables

Names must match the app (see `.env.example`). **Never commit `.env`.**

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL URL. Prisma uses this single datasource URL. |
| `AUTH_SECRET` | Yes | HMAC secret for the signed `tfo_session` cookie. Generate: `openssl rand -base64 32` (must be ≥ 16 characters). |
| `NODE_ENV` | Host | `production` (Vercel) enables Secure cookies. Leave unset locally. |

`NEXTAUTH_SECRET` is not used.

### `DATABASE_URL`: direct vs pooled

Neon gives a **direct** (non-pooler) URL and a **pooled** URL. This app uses **one** `DATABASE_URL`.

- **`npx prisma migrate deploy` requires the direct (non-pooler) URL.** Pooler / PgBouncer URLs fail migrations.
- Runtime can use a pooled URL if you split env vars later; today it does not. Locally, Docker’s URL is already “direct.”

Local Docker (from `.env.example`):

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/temp_fence_ops?schema=public"
```

Neon:

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

## Local Postgres + migrate + seed + dev

```bash
docker run --name tfo-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=temp_fence_ops \
  -p 5432:5432 -d postgres:16
```

Then:

```bash
npx prisma migrate deploy   # or: npm run db:migrate  (prisma migrate dev)
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to **Sign in**.

### After pull (existing Postgres)

```bash
git pull
npx prisma migrate deploy
npx prisma generate
npm run dev
```

If you still have a local SQLite `dev.db` from before Postgres, point `DATABASE_URL` at Postgres and run `migrate deploy` against a **fresh** database (do not reuse the SQLite file).

## Demo logins (demo-only)

Created by `npm run db:seed`. Same accounts as the [Operator’s Guide](docs/USER_GUIDE.md) / live demo:

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.local` | `DemoAdmin123!` | admin |
| `office@demo.local` | `DemoOffice123!` | office |

Prefer `admin@demo.local` for the full office workflow. Role is stored; **Admin screens are not hidden** (both users see the same nav).

**Do not use these passwords for real client jobs or a company deploy.** Create real users and a strong `AUTH_SECRET` — [docs/PRIVATE_DEPLOY.md](docs/PRIVATE_DEPLOY.md).

## Scripts / test

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (`next dev --turbopack`) |
| `npm run build` | `prisma generate` + `next build` |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed fake Miami/Davie data + demo logins (**destructive** wipe-then-insert) |
| `npm run db:reset` | `prisma migrate reset --force` (re-seed) |
| `npm test` | BOM calculator unit tests (Vitest) |
| `npm run test:watch` | Vitest watch |

`postinstall` runs `prisma generate`.

## Deploy

Production is Vercel (Hardpoint Hobby) + Neon, Git `main` → [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app).

**Follow [docs/RUNBOOK.md](docs/RUNBOOK.md)** for env on Vercel, migrate on the Neon **direct** URL, seed policy (demo only — never seed real client data), smoke checks (login + Generate BOM 6x10 / 400 LF / BFOOT → 40/41/39/82), and rollback.

Private company cutover (real users, no demo seed): [docs/PRIVATE_DEPLOY.md](docs/PRIVATE_DEPLOY.md).

## Other docs

- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — tables, inventory rules, P&L formulas
- [docs/BOM_FROM_EXCEL_DRAFT.md](docs/BOM_FROM_EXCEL_DRAFT.md) — historical Excel reverse-engineer (APPROVED wins)
- [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — phased roadmap (Waves 0–2 done)
- [docs/IMPORT.md](docs/IMPORT.md) / [docs/import-template.csv](docs/import-template.csv) — CSV import

## License

Private use by the repo owner unless otherwise stated. Sample data is fictional.
