# Private company deploy

Guidance for running Temp Fence Ops as an internal tool for a small office (1–2 users), without putting real employee PII in a public demo repo.

Live **public demo** ops (Hardpoint Hobby + Neon): [RUNBOOK.md](./RUNBOOK.md). This file is the **private / real-data** path.

## 1. Fork / private repo

- Keep the **public** demo on fake sample data only (no SSN, DOB, address, phone, personal email).
- For real operations data, **fork or copy into a private GitHub repo** (or keep the deploy private even if the code stays public).
- Never commit production `.env`, database dumps with real staff, or workbook exports that include HR fields.
- Strip or replace demo seed before loading history; import carefully and gate sensitive columns.

## 2. PostgreSQL (Neon or other managed Postgres)

Prisma `provider` is `postgresql`. Local and company deploys both use Postgres (Docker locally, or a Neon branch / production project). SQLite file URLs are not supported.

1. Set `DATABASE_URL` to your managed Postgres URL, e.g.:

   ```
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/temp_fence_ops?schema=public"
   ```

   Neon: use the **direct** (non-pooler) connection string for `prisma migrate deploy`, typically with `sslmode=require`. See `.env.example`.

2. Apply the checked-in Postgres baseline on an **empty** database:

   ```bash
   npx prisma migrate deploy
   ```

   Migration history is a single PostgreSQL baseline (`prisma/migrations`), not the old SQLite SQL. Do not run this against a leftover SQLite `dev.db`.

## 3. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon or local Docker; see `.env.example`) |
| `AUTH_SECRET` | Yes | HMAC secret for signed session cookies. Generate: `openssl rand -base64 32` |
| `NODE_ENV` | Host sets | `production` enables Secure cookies |

Optional / host-specific:

- `NEXTAUTH_SECRET` — not used by this app (we use a lightweight cookie session). If you later adopt Auth.js/NextAuth, set this instead/as well.
- Vercel/Railway/Render often inject `DATABASE_URL` when you attach a Postgres addon.

Never commit real secrets. Use `.env.example` as the template; keep `.env` local / in the host’s secret store.

## 4. Suggested hosts

### Primary path: Vercel + managed Postgres

Next.js + Prisma fits Vercel well (serverless/Node runtime, easy env UI).

1. Push your **private** repo to GitHub.
2. Create a Vercel project from that repo.
3. Provision Postgres (Vercel Postgres, Neon, Supabase, or Railway Postgres). Copy the connection string into Vercel env as `DATABASE_URL`.
4. Set `AUTH_SECRET` in Vercel env (long random string).
5. Build command: `prisma generate && next build` (already in `npm run build`). Ensure `postinstall` / build runs `prisma generate`.
6. After first deploy, run migrations against production DB (from CI, a one-off Vercel command, or locally with production `DATABASE_URL`):

   ```bash
   npx prisma migrate deploy
   ```

7. Create real users (see §5). Do **not** rely on demo passwords in production.

**Build note:** Prisma needs the query engine at build/runtime. Keep `prisma generate` in `postinstall` or `build`. For serverless, the default Prisma client is usually fine; if you hit binary issues, follow Prisma’s Vercel docs for the correct binary targets.

### Brief alternatives

| Host | Fit | Notes |
|------|-----|--------|
| **Railway** | Excellent | One service for Next.js + Postgres plugin; set env; `npm run build` + `npm run start`; run migrate on release. |
| **Render** | Good | Web service + Postgres; use start command `npx prisma migrate deploy && npm run start`. |
| **Fly.io** | Good | Containers; bundle Next standalone output; attach Fly Postgres or external DB. |
| **Netlify** | Possible but awkward | Next.js runtime on Netlify works for many apps, but Prisma + long-lived DB connections and migrations are smoother on Vercel/Railway/Render. Prefer those unless you already standardize on Netlify. |

## 5. Seed vs migrate in production

- **Migrations** (`prisma migrate deploy`) apply schema only — use this in production.
- **Seed** (`npm run db:seed`) loads **fake Miami/Davie demo data and demo logins**. Use seed for local/demo only.
- For production:
  1. Migrate the empty schema (`npx prisma migrate deploy`).
  2. Create real users with bcrypt-hashed passwords (small script or one-off `tsx`):

     ```ts
     import bcrypt from "bcryptjs";
     import { PrismaClient } from "@prisma/client";
     const prisma = new PrismaClient();
     await prisma.user.create({
       data: {
         email: "you@company.com",
         name: "Your Name",
         passwordHash: await bcrypt.hash("choose-a-strong-password", 10),
         role: "admin",
       },
     });
     ```

  3. Import jobs/inventory carefully; omit HR PII that does not belong in this ops DB.
  4. Change or delete any leftover demo users (`admin@demo.local`, `office@demo.local`).

## 6. Auth behavior (this codebase)

- Credentials login against Prisma `User` (`email` + bcrypt `passwordHash`).
- Signed JWT httpOnly cookie (`tfo_session`) via `AUTH_SECRET` (jose).
- Middleware redirects unauthenticated users to `/login` (all app pages except login/static).
- Server actions that mutate jobs call `requireSession()`.
- Nav shows signed-in name + Log out.

Demo logins (local seed only) are documented in the README — **demo-only**.

## 7. Mobile / tablet (field viewing)

- Layout is responsive (flex-wrap nav, max-width containers, scrollable tables).
- Field tips:
  - Prefer landscape tablet for Jobs / Inventory tables.
  - Use Analytics filters before scrolling wide LF tables.
  - Bookmark `/jobs` and `/inventory` after sign-in; session lasts ~14 days.
  - Avoid entering real customer PII beyond what ops already needs on shared devices; log out on shared tablets.

## Checklist

- [ ] Private repo / no real PII in public remotes
- [ ] Postgres `DATABASE_URL` (Neon direct URL for migrations)
- [ ] Strong unique `AUTH_SECRET`
- [ ] Migrate schema; do not seed demo data into production
- [ ] Create real users; remove demo accounts
- [ ] Confirm login → mutating job create/edit/delete → logout
