# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Reflections** is a multi-tenant accomplishment tracker for government/enterprise performance management. Employees log work accomplishments, get AI rewrites in STAR format (Situation, Task, Action, Result), link them to objectives and performance elements, and generate Weekly Activity Reports (WAR) and comms reports.

## Development Commands

### Backend (Node.js / Express / Prisma)
```bash
cd backend
npm install
npm run dev          # nodemon on :3001
npm run db:migrate   # Apply Prisma migrations
npm run db:seed      # Seed test data (see below for credentials)
npm run db:studio    # Prisma Studio GUI on :5555
```

### Frontend (React / Vite / Tailwind)
```bash
cd frontend
npm install
npm run dev          # Vite dev server on :5173 (proxies /api → :3001)
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

### Docker Compose (all-in-one local dev)
```bash
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend node prisma/seed.js
```

### Kubernetes / ArgoCD
```bash
# Helm install
helm install reflections ./helm/reflections \
  --set backend.env.FRONTEND_URL=https://reflections.shadyknollcave.io \
  -f helm/reflections/values-prod.yaml \
  --namespace reflections --create-namespace

# Build and push images
./scripts/build-images.sh

# Reseal secrets for cluster
./scripts/reseal-secrets.sh
```

## Architecture

### Request Flow
```
Browser → NGINX (frontend) → /api proxy → Express backend → Prisma → PostgreSQL
```

The frontend is a React SPA served by NGINX; `/api/*` is proxied to the backend. In development, Vite's dev server handles the proxy.

### Multi-Tenancy
Row-level security via `backend/src/middleware/tenant.middleware.js`. Every request from an authenticated user gets a Prisma client scoped to `req.user.tenantId` via Prisma `$extends`. All route handlers use `req.prisma.*` — never the global `basePrisma` (reserved for super_admin routes).

### Auth
Two modes, selected at startup by whether `OAUTH2_CLIENT_ID` is set:
- **Local**: email + password → JWT in httpOnly cookies (`reflections_at` / `reflections_rt`)
- **OIDC**: redirect to external issuer (any OpenID Connect provider)

Access tokens expire in 15m; refresh tokens in 7d. The Axios instance in `frontend/src/services/api.js` auto-queues requests and replays them after a transparent token refresh on 401.

Frontend auth state lives in Zustand (`frontend/src/store/auth.store.js`). Route guards (`RequireAuth`, `RequireRole`) live in `App.jsx`.

### AI Integration
`backend/src/services/ai.service.js` calls an OpenAI-compatible endpoint (configured via `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`). In production this hits LiteLLM → Claude Sonnet 4.6. Three functions:
- `rewriteAsSTAR` — STAR-format rewrite of raw accomplishment text
- `recommendLinks` — suggest matching objectives/elements for an accomplishment
- `generateWARNarrative` — prose summary for Weekly Activity Report

### Fiscal Year Logic
US Government fiscal year runs Oct 1 – Sep 30. `backend/src/utils/fiscalYear.js` calculates `fiscalYear` (int) and `period` (Q1–Q4 enum) from `dateOfAccomplishment`. These are computed server-side on create/update and never accepted from the client.

### Role-Based Access Control
Roles stored as a string array on `User.roles`. Predefined middleware composers: `requireSuperAdmin`, `requireSupervisor`, `requireComms`. Super admin can access all tenants; all other roles are tenant-scoped.

Roles in use: `employee`, `supervisor`, `comms`, `super_admin`.

## Key Files

| Path | Purpose |
|------|---------|
| `backend/src/app.js` | Express setup, CORS, global error handler |
| `backend/src/middleware/auth.middleware.js` | JWT verification, role helpers |
| `backend/src/middleware/tenant.middleware.js` | Scoped Prisma client per request |
| `backend/src/services/ai.service.js` | All LLM calls |
| `backend/src/services/auth.service.js` | Token generation, password hashing, OIDC |
| `backend/src/utils/fiscalYear.js` | FY + quarter calculation |
| `backend/prisma/schema.prisma` | Full data model |
| `backend/prisma/seed.js` | Test data (credentials below) |
| `frontend/src/App.jsx` | Router + route guards |
| `frontend/src/services/api.js` | Axios instance with refresh interceptor |
| `frontend/src/store/auth.store.js` | Zustand auth state |
| `frontend/nginx.conf` | SPA routing + `/api` proxy |
| `helm/reflections/values-prod.yaml` | Production Helm overrides |
| `k8s/argocd/reflections-app.yaml` | ArgoCD Application manifest |

## Data Model (Prisma)

Core entities: `Tenant → User → Objective / Element / Accomplishment`

`Accomplishment` is the primary entity: `rawText` (user input) → `starText` (AI rewrite) → `editedStarText` (user-edited final). Many-to-many relations to `Objective` and `Element` via junction tables with cascade deletes. `flaggedForComms` routes items to the comms workflow.

## Seeded Test Credentials

| Email | Password | Role | Tenant |
|-------|----------|------|--------|
| admin@reflections.local | ChangeMe123! | super_admin | system |
| sup@alpha.local | Password123! | supervisor | team-alpha |
| comms@alpha.local | Password123! | comms | team-alpha |
| emp1@alpha.local | Password123! | employee | team-alpha |

`team-bravo` mirrors `team-alpha` with `@bravo.local` addresses.

## Environment Variables

**Backend** (required):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — signing secret (`openssl rand -hex 32`)
- `FRONTEND_URL` — origin for CORS and OIDC redirects
- `AI_BASE_URL` — OpenAI-compatible endpoint
- `AI_API_KEY` — API key for the AI endpoint
- `AI_MODEL` — model name (default: `claude-sonnet-4-6`)

**OIDC** (optional, enables OIDC mode when set):
- `OAUTH2_CLIENT_ID`, `OAUTH2_CLIENT_SECRET`, `OAUTH2_ISSUER_URL`, `OAUTH2_REDIRECT_URI`
- `SUPER_ADMIN_EMAILS` — comma-separated list of emails that receive `super_admin` role on OIDC login (e.g. `alice@example.com,bob@example.com`). Roles sync on every login, so changes take effect without a DB edit. Super admins are placed in the system tenant.

**Frontend** (optional):
- `VITE_API_BASE_URL` — defaults to `/api`

## Container & K8s Notes

- Uses `podman` (not docker) per homelab setup; the Dockerfiles are compatible.
- Image registry: `git.shadyknollcave.io/micro/reflections-{backend,frontend}:[tag]`
- DB migrations run automatically in Kubernetes via a `db-migrate-job` Helm pre-upgrade hook before pods start.
- Sealed Secrets used for cluster credentials — never commit plaintext secrets; use `scripts/reseal-secrets.sh` to regenerate.
- ArgoCD uses `--core` mode (no `argocd login` — TLS termination at Cilium breaks gRPC).
