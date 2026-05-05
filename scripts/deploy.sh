#!/usr/bin/env bash
# Deploy Greenscape Quote Agent to Hetzner Server 1.
#
# Pre-reqs (handled by Chat C):
#   - /opt/greenscape-quote-agent          (root-owned)
#   - /etc/systemd/system/greenscape-quote-agent.service  (PORT=3100, loopback)
#   - /opt/greenscape-quote-agent/.env     (populated by you with prod env vars)
#
# Usage from project root on a workstation with SSH access to root@157.90.124.14:
#   ./scripts/deploy.sh
#
# Or from the server itself:
#   bash /opt/greenscape-quote-agent/scripts/deploy.sh --local
#
# What it does:
#   1. Build Next.js standalone locally (or on server, if --local)
#   2. rsync .next/standalone/, .next/static, public/, package.json to /opt/greenscape-quote-agent
#   3. systemctl restart greenscape-quote-agent
#   4. curl http://127.0.0.1:3100 to verify

set -euo pipefail

SERVER_USER="root"
SERVER_HOST="157.90.124.14"
SERVER_PATH="/opt/greenscape-quote-agent"
SERVICE_NAME="greenscape-quote-agent"
LOCAL_PORT="3100"

LOCAL_MODE="0"
if [[ "${1-}" == "--local" ]]; then
  LOCAL_MODE="1"
fi

cd "$(dirname "$0")/.."

if [[ "$LOCAL_MODE" == "1" ]]; then
  echo "===> Local mode (running on server)"
  npm ci
  npm run build

  # Preserve .env at the deploy root via --exclude=.env.
  rsync -a --delete --exclude=.env .next/standalone/ "$SERVER_PATH/"
  mkdir -p "$SERVER_PATH/.next/static" "$SERVER_PATH/public"
  rsync -a --delete .next/static/ "$SERVER_PATH/.next/static/"
  if [[ -d public ]]; then rsync -a --delete public/ "$SERVER_PATH/public/"; fi

  systemctl restart "$SERVICE_NAME"
  sleep 2
  curl -fsS "http://127.0.0.1:$LOCAL_PORT" >/dev/null && echo "===> Service is responding on $LOCAL_PORT"
  exit 0
fi

echo "===> Building locally"
npm ci
npm run build

if [[ ! -d .next/standalone ]]; then
  echo "ERROR: .next/standalone/ not produced. Check next.config.js has output: 'standalone'." >&2
  exit 1
fi

echo "===> Syncing build to $SERVER_USER@$SERVER_HOST:$SERVER_PATH"
# Preserve .env at the deploy root via --exclude=.env so secrets survive deploys.
rsync -az --delete --exclude=.env --rsh="ssh -i $HOME/.ssh/id_ed25519" \
  .next/standalone/ "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

ssh -i "$HOME/.ssh/id_ed25519" "$SERVER_USER@$SERVER_HOST" \
  "mkdir -p $SERVER_PATH/.next/static $SERVER_PATH/public"

rsync -az --delete --rsh="ssh -i $HOME/.ssh/id_ed25519" \
  .next/static/ "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/.next/static/"

if [[ -d public ]]; then
  rsync -az --delete --rsh="ssh -i $HOME/.ssh/id_ed25519" \
    public/ "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/public/"
fi

echo "===> Restarting systemd service"
ssh -i "$HOME/.ssh/id_ed25519" "$SERVER_USER@$SERVER_HOST" "
  systemctl restart $SERVICE_NAME
  sleep 2
  curl -fsS http://127.0.0.1:$LOCAL_PORT >/dev/null && echo 'Service is responding on $LOCAL_PORT'
"

echo "===> Done."
echo "Internal: http://127.0.0.1:$LOCAL_PORT (on server)"
echo "Public URL depends on Chat C publishing path (Caddy / Cloud Firewall / subdomain)."
