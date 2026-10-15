# Deployment — Backend on Render, Frontend on Vercel

```
university-portal/
├── render.yaml             Render Blueprint: backend web service + PostgreSQL
├── apps/
│   ├── backend/            → Render  (rootDir: apps/backend)
│   │   └── .env.example    Render variables reference
│   └── frontend/           → Vercel  (Root Directory: apps/frontend)
│       ├── vercel.json     Vite build + SPA rewrites for React Router
│       └── .env.example    Vercel variables reference
```

Deploy the backend first, because the frontend needs the backend URL.

---

## 0. Push to GitHub

Both platforms deploy from GitHub. Commit and push everything to `main`.

---

## 1. Backend + database on Render (Blueprint)

1. Go to **dashboard.render.com → New → Blueprint** and connect the `university-portal` repo.
2. Render reads `render.yaml` and proposes:
   - **university-portal-db**: PostgreSQL (free)
   - **university-portal-api**: Node web service (free), root directory `apps/backend`
3. It asks for `FRONTEND_URL`. If you don't have the Vercel URL yet, enter a
   placeholder such as `https://example.com` and update it in step 3.
4. Click **Apply**. Render then:
   - creates the database and wires `DATABASE_URL` to it (internal URL)
   - generates a random `JWT_SECRET`
   - build: `npm install` → `postinstall` runs `prisma generate`
   - start: `npm run deploy:db && npm start`. This runs `prisma db push`
     (syncs the schema), then starts Express.
   - healthcheck: `GET /health`
5. Your API URL appears at the top of the service page, e.g.
   `https://university-portal-api.onrender.com`.
   Check: open `https://university-portal-api.onrender.com/health`.
6. **Seed the database (first deploy only).** Render's Shell is paid-only, so
   seed from your own machine using the external URL:
   - Render → **university-portal-db → Connect → External Database URL** → copy it
   - then, from `apps/backend`:
     ```bash
     # Git Bash / macOS / Linux
     DATABASE_URL="<external database url>" npm run deploy:seed
     ```
     ```powershell
     # PowerShell
     $env:DATABASE_URL="<external database url>"; npm run deploy:seed
     ```

> **No Blueprint?** You can create the services by hand instead: create a **PostgreSQL**
> database, then a **Web Service** with Root Directory `apps/backend`, Build
> `npm install`, Start `npm run deploy:db && npm start`, Health Check Path
> `/health`. Set env vars: `DATABASE_URL` (the DB's *Internal* URL), `NODE_ENV=production`,
> `NODE_VERSION=22`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `FRONTEND_URL`.
> Create the DB and the service in the **same region**.

---

## 2. Frontend on Vercel

1. Go to **vercel.com → Add New → Project** and import `university-portal`.
2. Configure:
   - **Root Directory**: `apps/frontend` (click *Edit*)
   - Framework Preset: **Vite** (`vercel.json` already sets build = `npm run build`, output = `dist`)
3. **Environment Variables**:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://university-portal-api.onrender.com/api` (no trailing slash) |

4. Click **Deploy**. Note your URL, e.g. `https://university-portal.vercel.app`.

> `VITE_*` values are baked in at build time. If you change `VITE_API_URL`,
> **redeploy** the frontend.

---

## 3. Connect them (CORS)

Render → **university-portal-api → Environment** → set:

```
FRONTEND_URL=https://university-portal.vercel.app
```

- Use the exact origin, with no trailing slash.
- To allow several origins, separate them with commas.
- To also allow Vercel preview deployments, set `ALLOW_VERCEL_PREVIEWS=true`.

Save. Render redeploys. Then open the Vercel URL and log in.

---

## Free-tier limits

- **Cold starts:** a free web service sleeps after about 15 minutes with no
  traffic. The first request after that takes about 30–60 seconds, so the first
  login may seem slow.
- **Free PostgreSQL expires 30 days after creation.** Render emails you before
  it happens. Upgrade the database plan to keep your data.

## Later updates

- `git push` to `main`: both platforms redeploy automatically.
- Schema changes in `prisma/schema.prisma` are applied by `prisma db push` at
  the next start. If a change would drop data, the push fails and the service
  won't start. Check the Render logs, and consider moving to `prisma migrate`
  for production.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Browser console says "blocked by CORS" | `FRONTEND_URL` on Render must exactly match the Vercel origin |
| Frontend calls `localhost:5000` | `VITE_API_URL` is missing on Vercel; add it and redeploy |
| Refreshing a page gives a 404 on Vercel | Make sure `apps/frontend/vercel.json` is deployed (it has the SPA rewrite) |
| Render fails with `Can't reach database server` | DB and service must be in the same region; `DATABASE_URL` must be the Internal URL |
| Login fails with `secretOrPrivateKey must have a value` | `JWT_SECRET` isn't set on Render |
| Seeding fails with a connection error | Use the **External** Database URL when seeding from your machine |
