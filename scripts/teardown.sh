#!/usr/bin/env bash
# teardown.sh — remove the Greenscape Quote Agent deploy from Hetzner Server 1.
# Run this when the L&S take-home demo window is over (~1 week post-submit).
# Safe-by-default: each step prints what it will do and waits for confirmation.
# Idempotent: re-running is harmless once a step has succeeded.
#
# What this removes:
#   1. systemd service `greenscape-quote-agent.service` (stopped, disabled, file removed)
#   2. App directory `/opt/greenscape-quote-agent`
#   3. Caddy site block for `quote-agent.tunderman.cc` (only if it was added)
#   4. Cloudflare DNS record `quote-agent.tunderman.cc` (manual reminder — no API call)
#
# What this does NOT touch (read docs/12-deployment.md "Isolation rules"):
#   - Anything SchilderGroei (`/opt/schildergroei`, `schildergroei-*` services)
#   - Other lead-website APIs (willemschilderwerken-, schildersbedrijf-tijmen-,
#     bossche-schilderwerken-, veluws-schilderwerk-)
#   - Anything in /var/www
#   - Caddy itself — only the one site block we added (matched by sentinel markers)
#   - Node.js, npm, system packages, or any firewall rule

# -e: exit on first error · -u: unset vars are an error · -o pipefail: pipeline
# fails if any segment fails. Together these stop us from continuing past a
# failed remote SSH command.
set -euo pipefail

# --- config ---------------------------------------------------------------
# Server 1 is the same box that hosts SchilderGroei production. Listed in
# ~/Desktop/system/credentials.md. Do not change to any other server.
SERVER="root@157.90.124.14"
SSH_KEY="$HOME/.ssh/id_ed25519"

APP_DIR="/opt/greenscape-quote-agent"
SERVICE="greenscape-quote-agent.service"

# Sentinel markers — must match exactly the strings written into /etc/caddy/Caddyfile
# during initial setup. The Step-3 sed below uses them as a precise range so
# unrelated Caddy site blocks are never touched.
CADDY_MARK_BEGIN="# >>> greenscape-quote-agent (TEMPORARY — L&S take-home, remove via scripts/teardown.sh) >>>"
CADDY_MARK_END="# <<< greenscape-quote-agent <<<"

# Interactive y/N gate. Returns 0 only on an explicit "y" or "Y".
# Default is no, so accidentally pressing Enter aborts the step.
confirm() {
  local prompt="$1"
  read -r -p "$prompt [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

echo "=== Greenscape Quote Agent — teardown on $SERVER ==="
echo

# --- Step 1: systemd service ---------------------------------------------
# Stop the running service, disable any boot-time autostart (would only exist
# if someone ran `systemctl enable` post-setup), then remove the unit file.
# Each `... || true` makes the step idempotent: repeated runs after the unit
# is already gone exit cleanly.
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

# --- Step 2: app directory -----------------------------------------------
# rm -rf is intentional here: the directory only contains the Next.js
# standalone build output and an .env. Both are easy to recreate from the
# repo + credentials.md if we ever come back.
echo "Step 2: remove app directory $APP_DIR"
if confirm "Proceed?"; then
  ssh -i "$SSH_KEY" "$SERVER" "rm -rf $APP_DIR && echo 'app dir removed'"
fi
echo

# --- Step 3: Caddy site block --------------------------------------------
# Strategy:
#   1. Take a timestamped backup so the change is reversible (`cp` first).
#   2. Verify our sentinel marker exists; if not, exit cleanly (idempotent).
#   3. `sed -i '/BEGIN/,/END/d'` removes only the lines between the markers,
#      leaving every other site block untouched. This is critical because
#      the Caddyfile also defines SchilderGroei + 4 lead-website APIs.
#   4. Validate before reloading. Reload (not restart) so other sites stay up.
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

# --- Step 4: DNS (manual) ------------------------------------------------
# Cloudflare API token in ~/.zshrc currently returns 9109 invalid-access-token
# (see docs/12-deployment.md "Maintenance moving forward" item 4). Until that's
# rotated, DNS removal is a one-click manual action in the dashboard.
echo "Step 4 (manual): remove Cloudflare DNS record for quote-agent.tunderman.cc"
echo "  Visit https://dash.cloudflare.com/ba28420353f5337ec43ebdfe1ac09598/tunderman.cc/dns/records → delete the 'quote-agent' A record."
echo

# --- Sanity gate: confirm shared services survived -----------------------
# This is the single most important post-teardown check. If any of these
# four are not 'active', stop and investigate before touching anything else.
echo "=== Verifying SchilderGroei + Caddy still healthy ==="
ssh -i "$SSH_KEY" "$SERVER" "
  for s in schildergroei-api schildergroei-web willemschilderwerken-api caddy; do
    printf '  %-32s %s\n' \"\$s\" \"\$(systemctl is-active \$s)\"
  done
"
echo
echo "Teardown complete."
