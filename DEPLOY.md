# Deploying SuperLink on Render

Two services + one database:

| Resource | Type | Root dir | What it runs |
|----------|------|----------|--------------|
| `superlink-api` | Web Service (Node) | `backend` | Express + Prisma + Socket.io |
| `superlink-web` | Static Site | `frontend` | Vite/React build |
| `superlink-db` | PostgreSQL | — | Managed Postgres |

`render.yaml` at the repo root describes all three, so the whole stack can be
created in one step (Blueprint). The manual steps below do the same thing by hand.

---

## 0. Prerequisites (once)

1. Push the repo to GitHub (already: `vimalraj1112/Superlink`).
2. **Commit the Prisma migrations.** `prisma migrate deploy` needs them, and they
   were previously git-ignored:

   ```bash
   git add backend/prisma/migrations .gitignore render.yaml backend/package.json frontend/src/config/env.ts
   git commit -m "chore: Render deployment config"
   git push
   ```

---

## 1. Database

You already have a Render Postgres (`superlink_db`, region **Singapore**).

> If you create a new one instead, free instances expire after 30 days — export
> a backup or move to a paid plan before then.

**Important:** the current database is only half-provisioned — it contains
`Role`, `User` and an empty `_prisma_migrations`, but none of the other 10+
tables. `prisma migrate deploy` would fail with `relation "Role" already exists`.

Fix it once, from your machine, using the **External Database URL**
(Render → database → Connect):

```bash
cd backend
$env:DATABASE_URL="postgresql://superlink_db_user:...@dpg-xxxx-a.singapore-postgres.render.com/superlink_db?schema=public"
npx prisma migrate reset --force
```

This drops the schema, applies every migration, then runs `prisma/seed.ts`
(all roles, the admin user and sample data). Add `--skip-seed` if you want an
empty database, but then create the roles before adding users.

---

## 2. Backend — Web Service

Render → **New → Web Service** → pick the repo.

| Setting | Value |
|---------|-------|
| Name | `superlink-api` |
| Region | Singapore (must match the database) |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run prisma:deploy && npm start` |
| Health Check Path | `/api/v1/health` |

`--include=dev` matters: the build needs `typescript`, `prisma` and `tsc-alias`,
and `NODE_ENV=production` would otherwise skip devDependencies.

Environment variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | the database's **Internal** connection string |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | random, ≥ 32 chars (`openssl rand -base64 48`) |
| `ENCRYPTION_KEY` | random, ≥ 32 chars — **changing it later makes stored credentials unreadable** |
| `CORS_ORIGIN` | `https://<your-frontend>.onrender.com` (exact origin, no trailing slash) |
| `FRONTEND_URL` | same as `CORS_ORIGIN` |
| `TELEGRAM_*`, `WHATSAPP_*` | optional, leave empty to disable |

Leave `PORT` unset — Render injects it.

---

## 3. Frontend — Static Site

Render → **New → Static Site** → same repo.

| Setting | Value |
|---------|-------|
| Name | `superlink-web` |
| Root Directory | `frontend` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

Environment variables (read at **build** time — changing them requires a redeploy):

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://<your-backend>.onrender.com` |
| `VITE_API_VERSION` | `v1` |
| `VITE_APP_NAME` | `SuperLink CRM` |

Add a rewrite so client-side routing survives a refresh:

- Source `/*` → Destination `/index.html` (Rewrite, not Redirect).

---

## 4. Wire the two together

1. Deploy the backend first, note its URL.
2. Put that URL in the static site's `VITE_API_URL`, deploy the frontend.
3. Put the frontend URL in the backend's `CORS_ORIGIN` + `FRONTEND_URL`, redeploy.
4. Open the frontend and log in: `admin@superlinkit.com` / `SuperLink@2024!`
   — change this password immediately.

If login fails with a CORS error in the browser console, `CORS_ORIGIN` does not
match the address in the address bar exactly (scheme included).

---

## Blueprint alternative

With `render.yaml` committed: Render → **New → Blueprint** → select the repo.
It creates the database and both services, generating `JWT_SECRET` and
`ENCRYPTION_KEY`. It still asks for `CORS_ORIGIN` and `FRONTEND_URL`; fill them
in after the first deploy and set `DATABASE_URL` to your existing database if
you don't want the new one.

---

## Moving your existing local data to Render

Deploying does **not** copy your local database — Render starts empty. To move
`Customer`, `Site`, `User`, etc. from `localhost:5432/superlink_db`:

1. Apply the schema on Render (step 1 above).
2. Copy rows in FK-safe order: `Role → User → ISP → Customer → Site →
   SiteCredential → Ticket → TicketMessage → ChatSession → ChatMessage →
   Payment → AuditLog → Quotation → QuotationItem`, preserving the `cuid` ids so
   every relation stays valid (see the one-off script used for the initial
   migration, or use `pg_dump`/`pg_restore`).
3. Do not truncate `_prisma_migrations` — that's what keeps `migrate deploy` working.

After the copy, local and production are two independent databases. Pick one as
the source of truth: either point `backend/.env` at the Render **External**
Database URL while developing, or keep a documented export/import routine.

Site credentials (`SiteCredential.passwordEnc`) are encrypted with
`ENCRYPTION_KEY`. If you copy rows between environments, both must use the same
key or the vault entries become unreadable.

## Free-tier limitations

- Web services sleep after ~15 min idle → first request takes ~30–60 s and
  Socket.io reconnects afterwards.
- Instances have ephemeral disks: payment receipts written to
  `backend/uploads/payments` **disappear on every deploy/restart**. Attach a
  Render Disk or move uploads to S3-compatible storage for real use.
- Free Postgres expires after 30 days.
- Background/cron jobs and `preDeployCommand` require a paid plan, which is why
  migrations run inline in the start command.
