# Reflections

Professional accomplishment tracker for government/enterprise performance management. Employees log accomplishments, AI rewrites them in STAR format, they link to personal objectives and performance elements, generate Weekly Activity Reports (WAR), and flag items for the communications team.

## Quick Start (Docker Compose)

```bash
# 1. Copy and configure environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit backend/.env — set JWT_SECRET, AI_BASE_URL, AI_API_KEY

# 2. Start services
docker compose up -d

# 3. Run migrations and seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend node prisma/seed.js

# 4. Open the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001/api
```

## Seed Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| Super Admin | admin@reflections.local | ChangeMe123! | system |
| Supervisor | sup@alpha.local | Password123! | team-alpha |
| Communications | comms@alpha.local | Password123! | team-alpha |
| Employee | emp1@alpha.local | Password123! | team-alpha |
| Employee | emp2@alpha.local | Password123! | team-alpha |
| Employee | emp3@alpha.local | Password123! | team-alpha |

Same pattern for `@bravo.local` (tenant: team-bravo).

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Long random secret for JWT signing |
| `JWT_ACCESS_EXPIRY` | No | Access token expiry (default: 15m) |
| `JWT_REFRESH_EXPIRY` | No | Refresh token expiry (default: 7d) |
| `AI_BASE_URL` | Yes | OpenAI-compatible API base URL |
| `AI_API_KEY` | Yes | API key for AI service |
| `AI_MODEL` | No | Model name (default: claude-sonnet-4-6) |
| `FRONTEND_URL` | Yes | Frontend origin for CORS |
| `PORT` | No | Backend port (default: 3001) |
| `OAUTH2_CLIENT_ID` | No | Enable OIDC mode if set |
| `OAUTH2_CLIENT_SECRET` | No | OIDC client secret |
| `OAUTH2_ISSUER_URL` | No | OIDC issuer URL (internal IdP) |
| `OAUTH2_REDIRECT_URI` | No | OIDC callback URL |
| `CHECKPOINT_DISABLE` | No | Set to 1 to disable Prisma telemetry |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | Backend API URL (default: /api) |

## Authentication Modes

### Local username/password (default)

Leave all `OAUTH2_*` variables empty. Users are created by supervisors or super admins via the Team management UI.

```bash
POST /api/auth/login  { email, password }
```

### OAuth2/OIDC

Set `OAUTH2_CLIENT_ID`, `OAUTH2_CLIENT_SECRET`, `OAUTH2_ISSUER_URL`, and `OAUTH2_REDIRECT_URI`. The app will automatically use PKCE flow and redirect to your internal IdP.

The frontend detects auth mode via `GET /api/auth/config` → `{ mode: "local" | "oidc" }`.

## LiteLLM Proxy Configuration

Reflections uses OpenAI-compatible API calls. To route AI requests through a LiteLLM proxy:

```bash
# backend/.env
AI_BASE_URL=http://litellm.internal:4000/v1
AI_API_KEY=your-litellm-master-key
AI_MODEL=claude-sonnet-4-6    # or whatever model your proxy exposes
```

LiteLLM can proxy to Anthropic, Azure OpenAI, or local models. See [LiteLLM docs](https://docs.litellm.ai) for proxy setup.

## Roles

| Role | Capabilities |
|---|---|
| `super_admin` | Manage all tenants and users globally |
| `supervisor` | Manage team members, view all team accomplishments |
| `employee` | Manage own objectives, elements, and accomplishments |
| `comms` | View all flagged accomplishments, generate comms reports |

Users can have multiple roles (e.g., `["supervisor", "comms"]`).

## Fiscal Year

The app uses US Government fiscal year (Oct 1 – Sep 30):

| Quarter | Months |
|---|---|
| Q1 | October – December |
| Q2 | January – March |
| Q3 | April – June |
| Q4 | July – September |

`fiscalYear` and `period` are always auto-derived from `dateOfAccomplishment` — never accepted from clients.

## Air-Gap Build

### 1. Package dependencies (internet-connected machine)

```bash
./scripts/package-for-airgap.sh
# Creates: reflections-node-modules.tar.gz
```

### 2. Build and save container images

```bash
./scripts/build-images.sh registry.internal.example.com v1.0.0
# Creates: reflections-backend.tar.gz, reflections-frontend.tar.gz
```

### 3. Transfer to air-gap environment

Copy the `.tar.gz` files to the air-gap machine via USB or other approved media.

### 4. Load and push images

```bash
podman load < reflections-backend.tar.gz
podman load < reflections-frontend.tar.gz
podman push registry.internal.example.com/reflections-backend:v1.0.0
podman push registry.internal.example.com/reflections-frontend:v1.0.0
```

### Font note

The Inter font is bundled via `@fontsource/inter` (npm package). No external font CDN is used. The font files are inlined at build time into the static bundle.

## Kubernetes / Helm Deployment

### First install (internet-connected)

```bash
helm install reflections ./helm/reflections \
  --set backend.env.FRONTEND_URL=https://reflections.example.com \
  --set backend.env.AI_BASE_URL=http://litellm.internal:4000/v1 \
  --set backend.databaseUrl="postgresql://user:pass@postgres:5432/reflections" \
  --set backend.jwtSecret="$(openssl rand -hex 32)" \
  --set backend.aiApiKey="your-key" \
  --set seed.enabled=true \
  --namespace reflections --create-namespace
```

### Air-gap install

```bash
helm install reflections ./helm/reflections \
  -f ./helm/reflections/values.airgap.yaml \
  --set backend.databaseUrl="postgresql://user:pass@postgres:5432/reflections" \
  --set backend.jwtSecret="$(openssl rand -hex 32)" \
  --set backend.aiApiKey="your-key" \
  --set backend.env.FRONTEND_URL="https://reflections.youragency.internal" \
  --set backend.env.AI_BASE_URL="http://litellm.internal:4000/v1" \
  --set seed.enabled=true \
  --namespace reflections --create-namespace
```

### Upgrade after image update

```bash
helm upgrade reflections ./helm/reflections \
  -f ./helm/reflections/values.airgap.yaml \
  --namespace reflections
```

### Using your homelab ArgoCD + Cilium ingress

```yaml
# values.override.yaml
ingress:
  className: cilium
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: reflections.shadyknollcave.io
      paths:
        - path: /api
          pathType: Prefix
          service: backend
        - path: /
          pathType: Prefix
          service: frontend
  tls:
    - secretName: reflections-tls
      hosts:
        - reflections.shadyknollcave.io
```

```bash
helm install reflections ./helm/reflections -f values.override.yaml --namespace reflections --create-namespace
```

### Validate Helm chart

```bash
helm lint ./helm/reflections
helm template reflections ./helm/reflections -f ./helm/reflections/values.airgap.yaml
```

## Development (Local)

```bash
# Backend
cd backend
npm install
# Ensure postgres is running, then:
npm run db:migrate   # creates migrations + applies
npm run db:seed      # seeds test data
npm run dev          # starts on :3001 with nodemon

# Frontend
cd frontend
npm install
npm run dev          # starts on :5173 with Vite HMR
```

## Project Structure

```
reflections/
├── backend/
│   ├── src/
│   │   ├── routes/          # auth, tenants, users, objectives, elements, accomplishments, reports
│   │   ├── middleware/       # auth.middleware.js, tenant.middleware.js
│   │   ├── services/         # ai.service.js, auth.service.js
│   │   └── utils/            # fiscalYear.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/            # auth, dashboard, setup, accomplishments, war, comms, supervisor, admin
│   │   ├── components/       # ui/, layout/, reports/
│   │   ├── services/         # api.js (Axios + refresh interceptor)
│   │   ├── store/            # auth.store.js (Zustand)
│   │   └── constants/        # sayings.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── helm/reflections/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values.airgap.yaml
│   └── templates/
├── scripts/
│   ├── build-images.sh
│   └── package-for-airgap.sh
└── docker-compose.yml
```
