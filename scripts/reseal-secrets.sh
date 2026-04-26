#!/bin/bash
# Regenerate reflections-sealed-secret.yaml from backend/.env + current cluster values.
# Preserves JWT_SECRET, DATABASE_URL, POSTGRES_* from the live cluster secret.
# Updates AI_BASE_URL, AI_API_KEY, AI_MODEL from backend/.env.
# Usage: ./scripts/reseal-secrets.sh [--restart]
#   --restart   also rolls out reflections-backend after applying

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/backend/.env"
SEALED_SECRET_FILE="$ROOT_DIR/k8s/argocd/reflections-sealed-secret.yaml"
NAMESPACE="reflections"
SECRET_NAME="reflections-secrets"

# ── helpers ──────────────────────────────────────────────────────────────────

die() { echo "ERROR: $*" >&2; exit 1; }

env_val() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//'
}

cluster_val() {
  local key="$1"
  kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" \
    -o "jsonpath={.data.${key}}" 2>/dev/null | base64 -d
}

# ── preflight ─────────────────────────────────────────────────────────────────

[[ -f "$ENV_FILE" ]]          || die "backend/.env not found — copy backend/.env.template first"
command -v kubectl  &>/dev/null || die "kubectl not found"
command -v kubeseal &>/dev/null || die "kubeseal not found"

echo "Reading AI config from backend/.env..."
AI_BASE_URL=$(env_val AI_BASE_URL)
AI_API_KEY=$(env_val AI_API_KEY)
AI_MODEL=$(env_val AI_MODEL)

[[ -n "$AI_BASE_URL" ]] || die "AI_BASE_URL is empty in backend/.env"
[[ -n "$AI_API_KEY"  ]] || die "AI_API_KEY is empty in backend/.env"
[[ -n "$AI_MODEL"    ]] || AI_MODEL="claude-sonnet-4-6"

# ── read stable values from cluster (or generate fresh ones) ──────────────────

echo "Reading stable secrets from cluster ($NAMESPACE/$SECRET_NAME)..."

JWT_SECRET=$(cluster_val JWT_SECRET)
DATABASE_URL=$(cluster_val DATABASE_URL)
POSTGRES_PASSWORD=$(cluster_val POSTGRES_PASSWORD)
POSTGRES_USER=$(cluster_val POSTGRES_USER)
OAUTH2_CLIENT_ID=$(cluster_val OAUTH2_CLIENT_ID)
OAUTH2_CLIENT_SECRET=$(cluster_val OAUTH2_CLIENT_SECRET)
OAUTH2_ISSUER_URL=$(cluster_val OAUTH2_ISSUER_URL)
OAUTH2_REDIRECT_URI=$(cluster_val OAUTH2_REDIRECT_URI)

# Fall back to generating new values if cluster secret doesn't exist yet
if [[ -z "$JWT_SECRET" ]]; then
  echo "  No cluster secret found — generating fresh JWT_SECRET and POSTGRES_PASSWORD"
  JWT_SECRET=$(openssl rand -hex 32)
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  POSTGRES_USER="${POSTGRES_USER:-reflections}"
  DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@reflections-postgres:5432/reflections"
fi

# ── seal ──────────────────────────────────────────────────────────────────────

echo "Sealing secret..."

mkdir -p "$(dirname "$SEALED_SECRET_FILE")"

kubectl create secret generic "$SECRET_NAME" \
  -n "$NAMESPACE" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=AI_BASE_URL="$AI_BASE_URL" \
  --from-literal=AI_API_KEY="$AI_API_KEY" \
  --from-literal=AI_MODEL="$AI_MODEL" \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=POSTGRES_USER="$POSTGRES_USER" \
  --from-literal=OAUTH2_CLIENT_ID="${OAUTH2_CLIENT_ID:-}" \
  --from-literal=OAUTH2_CLIENT_SECRET="${OAUTH2_CLIENT_SECRET:-}" \
  --from-literal=OAUTH2_ISSUER_URL="${OAUTH2_ISSUER_URL:-}" \
  --from-literal=OAUTH2_REDIRECT_URI="${OAUTH2_REDIRECT_URI:-}" \
  --dry-run=client -o yaml \
  | kubeseal --format yaml > "$SEALED_SECRET_FILE"

echo "  Written: $SEALED_SECRET_FILE"

# ── apply ─────────────────────────────────────────────────────────────────────

echo "Applying sealed secret to cluster..."
kubectl apply -f "$SEALED_SECRET_FILE"

echo "Waiting for SealedSecret to unseal..."
kubectl wait sealedsecret "$SECRET_NAME" -n "$NAMESPACE" \
  --for=condition=Synced --timeout=30s 2>/dev/null || true

# ── optional restart ──────────────────────────────────────────────────────────

if [[ "${1:-}" == "--restart" ]]; then
  echo "Restarting reflections-backend..."
  kubectl rollout restart deployment/reflections-backend -n "$NAMESPACE"
  kubectl rollout status deployment/reflections-backend -n "$NAMESPACE" --timeout=90s
fi

# ── commit ────────────────────────────────────────────────────────────────────

echo ""
echo "Commit the updated sealed secret to git:"
echo "  git add k8s/argocd/reflections-sealed-secret.yaml"
echo "  git commit -m 'chore: update sealed secret'"
echo "  git push origin main"
echo ""
echo "Done."
