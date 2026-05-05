#!/usr/bin/env bash
# teardown.sh — remove the Greenscape Quote Agent deploy from Hetzner Server 1.
# Run this when the L&S take-home demo window is over (~1 week post-submit).
# Safe-by-default: each step prints what it will do and waits for confirmation.
#
# What this removes:
#   1. systemd service `greenscape-quote-agent.service` (stopped, disabled, file removed)
#   2. App directory `/opt/greenscape-quote-agent`
#   3. Caddy site block for `quote-agent.tunderman.io` (only if it was added)
#   4. Cloudflare DNS record for `quote-agent.tunderman.io` (manual reminder — no API call)
#
# What this does NOT touch:
#   - Anything SchilderGroei (`/opt/schildergroei`, `schildergroei-*` services)
#   - Anything in /var/www
#   - Caddy itself (only the one site block we added)
#   - Node.js, npm, system packages

set -euo pipefail

SERVER="root@157.90.124.14"
SSH_KEY="$HOME/.ssh/id_ed25519"
APP_DIR="/opt/greenscape-quote-agent"
SERVICE="greenscape-quote-agent.service"
CADDY_MARK_BEGIN="# >>> greenscape-quote-agent (TEMPORARY — L&S take-home, remove via scripts/teardown.sh) >>>"
CADDY_MARK_END="# <<< greenscape-quote-agent <<<"

confirm() {
  local prompt="$1"
  read -r -p "$prompt [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

echo "=== Greenscape Quote Agent — teardown on $SERVER ==="
echo

echo "Step 1: stop + disable + remove systemd service"
if confirm "Proceed?"; then
  ssh -i "$SSH_KEY" "$SERVER" "
    set -e
    systemctl is-active $SERVICE && systemctl stop $SERVICE || true
    systemctl is-enabled $SERVICE 2>/dev/null && systemctl disable $SERVICE || true
    rm -f /etc/systemd/system/$SERVICE
    systemctl daemon-reload
    echo 'service removed'
  "
fi
echo

echo "Step 2: remove app directory $APP_DIR"
if confirm "Proceed?"; then
  ssh -i "$SSH_KEY" "$SERVER" "rm -rf $APP_DIR && echo 'app dir removed'"
fi
echo

echo "Step 3: remove Caddy site block (if present)"
if confirm "Proceed?"; then
  ssh -i "$SSH_KEY" "$SERVER" "
    set -e
    cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.pre-teardown.\$(date +%Y%m%d-%H%M%S)
    if grep -q '$CADDY_MARK_BEGIN' /etc/caddy/Caddyfile; then
      sed -i '/$CADDY_MARK_BEGIN/,/$CADDY_MARK_END/d' /etc/caddy/Caddyfile
      caddy validate --config /etc/caddy/Caddyfile
      systemctl reload caddy
      echo 'caddy block removed + reloaded'
    else
      echo 'no greenscape block found in Caddyfile — nothing to remove'
    fi
  "
fi
echo

echo "Step 4 (manual): remove Cloudflare DNS record for quote-agent.tunderman.io"
echo "  Visit https://dash.cloudflare.com/ → tunderman.io → DNS → delete the A record."
echo

echo "=== Verifying SchilderGroei still healthy ==="
ssh -i "$SSH_KEY" "$SERVER" "
  for s in schildergroei-api schildergroei-web willemschilderwerken-api caddy; do
    printf '  %-32s %s\n' \"\$s\" \"\$(systemctl is-active \$s)\"
  done
"
echo
echo "Teardown complete."
