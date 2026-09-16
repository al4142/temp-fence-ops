# Temp Fence Ops

Public demo of an operations tracker for temporary-fence install and pickup work (events and construction). It replaces a slow Excel workbook covering daily jobs, inventory by yard, and P&L by order number. Hosted for Hardpoint on Vercel; the UI name is **Temp Fence Ops**. **This repository uses fake sample data only** (no SSN, DOB, address, phone, or personal email on employees).

This README is **developer setup**. Day-to-day office use is the Operator’s Guide.

| Doc | Audience |
|-----|----------|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Operators — login, nav, jobs, Generate BOM, inventory, P&L |
| [docs/TECH_SPEC.md](docs/TECH_SPEC.md) | Engineers — architecture, stack, modules, auth, non-goals |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Ops — production URL, Vercel/Neon, migrate, seed policy, smoke checks |
| [docs/BOM_APPROVED.md](docs/BOM_APPROVED.md) | Everyone — **locked** temporary-fence BOM recipes |

**Live demo:** [https://temp-fence-ops.vercel.app](https://temp-fence-ops.vercel.app)

---

## Prerequisites

- **Node.js 20+** (Next.js 15) and npm
- **PostgreSQL 14+** — local Docker, a [Neon](https://neon.tech) branch, or any Postgres 14+
- Git

Prisma `provider` is `postgresql`. SQLite (`file:./dev.db`) is not supported.

---

## Clone and environment

```bash
git clone https://github.com/al4142/temp-fence-ops.git
cd temp-fence-ops
npm install
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Postgres connection string. **Migrations need the Neon direct (non-pooler) URL** (`ep-….neon.tech`, not `-pooler`). Runtime in this app uses the same single `DATABASE_URL`. Local Docker example below. Always `sslmode=require` on Neon. |
| `AUTH_SECRET` | Yes | HMAC secret for the signed `tfo_session` cookie. Generate: `openssl rand -base64 32`. Must be at least 16 characters. |

Do not commit `.env`. `NEXTAUTH_SECRET` is unused (this is not Auth.js).

---

## Local Postgres (Docker)

```bash
docker run --name tfo-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=temp_fence_ops \
  -p 5432:5432 \
  -d postgres:16
```

```bash
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/temp_fence_ops?schema=public"
AUTH_SECRET="replace-with-a-long-random-string"
```

A Neon **branch** connection string works the same way; use the **direct** URL for `prisma migrate deploy`.

If you still have an old SQLite `dev.db`, ignore it. Point `DATABASE_URL` at Postgres and migrate a **fresh** database.

---

## Migrate, seed, and run

```bash
npx prisma migrate deploy   # or: npm run db:migrate  (prisma migrate dev)
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you are redirected to **Sign in**.

### After pull (existing Postgres)

```bash
git pull
npx prisma migrate deploy
npx prisma generate
npm run dev
```

`npm run db:seed` **wipes and reloads** fake Miami/Davie data. Use it locally (and on the public demo only if you intend to reset the sample). **Never seed a database that holds real client jobs or inventory** — [docs/RUNBOOK.md](docs/RUNBOOK.md).

---

## Demo logins (demo-only)

Created by `npm run db:seed`. They also exist on the live demo.

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.local` | `DemoAdmin123!` | admin |
| `office@demo.local` | `DemoOffice123!` | office |

Role is stored on `User` but **not** used to hide Admin screens. **Do not use these passwords in a real company deploy** — create real users and a strong `AUTH_SECRET` ([docs/PRIVATE_DEPLOY.md](docs/PRIVATE_DEPLOY.md)).

---

## Scripts and tests

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | `prisma generate` + `next build` |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed fake Miami/Davie sample data |
| `npm run db:reset` | Reset DB + re-seed (**destructive**) |
| `npm test` | BOM calculator unit tests (Vitest) |
| `npm run test:watch` | Vitest watch |

Canonical BOM smoke (also in the runbook): **6x10 / 400 LF / BFOOT** → 40 panels / 41 T-STANDS / 39 clamps / 82 BIG FEET.

---

## Deploy

Production is Vercel Hobby (team **HARDPOINT** / `hardpoint1`) + Neon. Merge to `main` → Vercel Git integration. Migrate Neon with the **direct** URL. Seed is demo-only.

**Full ops path (URLs, env, migrate, smoke, rollback, who to ping):** [docs/RUNBOOK.md](docs/RUNBOOK.md).

Private company fork (real users, no demo seed): [docs/PRIVATE_DEPLOY.md](docs/PRIVATE_DEPLOY.md).

---

## Stack (short)

Next.js App Router + TypeScript + Tailwind, Prisma, PostgreSQL (Neon or Docker), credentials auth (bcrypt + jose httpOnly cookie), ExcelJS for **Export Project**. Phases 0–5, polish, Wave 1 ledger, and Wave 2 BOM calculator are implemented — [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md).

Inventory: INST/DELIVERY decrease on-hand; PU/PICKUP increase it. Details: [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

---

## More docs

- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — tables, inventory rules, P&L
- [docs/BOM_FROM_EXCEL_DRAFT.md](docs/BOM_FROM_EXCEL_DRAFT.md) — historical Excel reverse-engineer (use only where APPROVED points at it)
- [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — phased roadmap
- [docs/PRIVATE_DEPLOY.md](docs/PRIVATE_DEPLOY.md) — private repo, Postgres, env, hosts, production users
- [docs/IMPORT.md](docs/IMPORT.md) — Excel → CSV import
- [docs/import-template.csv](docs/import-template.csv) — sample import file

---

## License

Private use by the repo owner unless otherwise stated. Sample data is fictional.
