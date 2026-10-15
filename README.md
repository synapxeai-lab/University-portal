# University Attendance Management System

npm workspaces monorepo — React + Vite · Express · PostgreSQL · Prisma · JWT Auth

> **Current phase:** JWT Authentication + Role-Based Dashboard Routing.
> Only PostgreSQL runs in Docker. Frontend and backend run natively via npm.

---

## Architecture

```
attendance-management-system/
├── apps/
│   ├── backend/            Express API · Prisma · JWT · bcrypt
│   └── frontend/           React 18 · Vite · React Router
├── scripts/
│   └── kill-port.js        Kills port 5000 before dev start
├── docker-compose.yml      PostgreSQL 16 container only
├── .env                    Single shared env for both apps
└── package.json            Root workspace orchestrator
```

**Key design decisions:**
- A single `.env` at the root is shared by both apps.
- Only the database runs in Docker — apps run natively (no CRLF/volume issues).
- Vite proxies `/api/*` to the backend — no CORS issues in development.
- `dotenv-cli` injects the root `.env` into every backend npm script.
- `concurrently` starts both apps with a single `npm run dev`.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 20 | Runtime for both apps |
| npm | ≥ 10 | Workspace package manager |
| Docker Desktop | Latest | PostgreSQL container |

---

## First-Time Setup

### 1. Clone and enter the project

```bash
cd attendance-management-system
```

### 2. Create the `.env` file

```bash
copy .env.example .env
```

Edit `.env` and set a strong `JWT_SECRET`. All other defaults work for local development.

### 3. Install all dependencies (from root)

```bash
npm install
```

This installs dependencies for the root, backend, and frontend workspaces in one command.

### 4. Start the PostgreSQL container

```bash
npm run db:up
```

Verify it is healthy:
```bash
docker compose ps
```

### 5. Push the Prisma schema to the database

```bash
npm run db:push
```

### 6. Generate the Prisma client

```bash
npm run db:generate
```

### 7. Seed the database with roles

```bash
npm run db:seed
```

This creates the ADMIN, TEACHER, and STUDENT roles.

### 8. Start both apps

```bash
npm run dev
```

Frontend and backend start concurrently. Open http://localhost:5173.

---

## Daily Development

```bash
npm run db:up     # ensure PostgreSQL is running
npm run dev       # start frontend + backend together
```

---

## URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Health check | http://localhost:5000/health |
| Prisma Studio | http://localhost:5555 (via npm run db:studio) |

---

## All Root npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:backend` | Backend only |
| `npm run dev:frontend` | Frontend only |
| `npm run db:up` | Start PostgreSQL Docker container |
| `npm run db:down` | Stop PostgreSQL Docker container |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create a named migration |
| `npm run db:seed` | Seed roles (idempotent) |
| `npm run db:studio` | Open Prisma Studio at :5555 |

---

## API Endpoints

### Auth (public)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register with name, email, password, role |
| POST | `/api/auth/login` | Login, returns JWT token |
| POST | `/api/auth/logout` | Logout (client removes token) |
| GET  | `/api/auth/me` | Get current user (requires Bearer token) |

### Dashboard (requires Bearer JWT)

| Method | Endpoint | Required Role |
|---|---|---|
| GET | `/api/dashboard/admin` | ADMIN |
| GET | `/api/dashboard/teacher` | TEACHER |
| GET | `/api/dashboard/student` | STUDENT |

---

## Frontend Routes

| Path | Access | Description |
|---|---|---|
| `/` | Public | Redirects based on role or to login |
| `/login` | Public | Login page |
| `/signup` | Public | Signup page |
| `/admin/dashboard` | ADMIN only | Admin dashboard |
| `/teacher/dashboard` | TEACHER only | Teacher dashboard |
| `/student/dashboard` | STUDENT only | Student dashboard |

---

## Testing the Auth Flow

1. Go to http://localhost:5173/signup
2. Fill in name, email, password, choose a role
3. You'll be redirected to login after signup
4. Log in — you land on the correct role dashboard
5. Try visiting another role's dashboard — you get redirected

**Test with curl:**
```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@uni.edu","password":"secret123","role":"ADMIN"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@uni.edu","password":"secret123"}'
```

---

## Prisma Commands

```bash
# Push schema changes to DB (no migration file)
npm run db:push

# Create a versioned migration
npm run db:migrate

# Re-seed roles
npm run db:seed

# Open DB GUI
npm run db:studio
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find module` in backend | Run `npm install` from root |
| `DATABASE_URL` error | Ensure PostgreSQL is running: `npm run db:up` |
| Port 5000 already in use | `npm run dev` auto-kills it via `scripts/kill-port.js` |
| Prisma client not found | Run `npm run db:generate` |
| Roles not found on signup | Run `npm run db:seed` |
| Frontend shows blank page | Check backend is running: `npm run dev:backend` |

---

## What Is Implemented

- [x] JWT authentication (signup, login, logout, /me)
- [x] Password hashing with bcryptjs (12 rounds)
- [x] Role-based access control (ADMIN / TEACHER / STUDENT)
- [x] Protected API routes per role
- [x] Auto role seeding on `npm run db:seed`
- [x] Login + Signup pages (Moodle-inspired UI)
- [x] Role-based redirect after login
- [x] Protected frontend routes
- [x] Dummy dashboards for all 3 roles with sidebar layout

## Planned for Future Phases

- [ ] Course management
- [ ] Attendance marking by teachers
- [ ] Student attendance records and reports
- [ ] Admin user management panel
- [ ] Email notifications
