# 12 — Deployment

Canonical reference for the deployment infrastructure. Owner: **Chat C**. Read this when changing anything that touches DNS, TLS, the reverse proxy, the systemd service, the deploy script, or the `/opt/greenscape-quote-agent` directory on the server.

---

## At a glance

| Property | Value |
|---|---|
| Public URL | **https://quote-agent.tunderman.cc** |
| TLS | Caddy auto-Let's-Encrypt (issuer `E7`, valid until 2026-08-03; auto-renews) |
| Server | Hetzner Server 1 (`157.90.124.14`, `ubuntu-4gb-nbg1-2`) |
| Server is shared with | SchilderGroei production + 4 lead-website APIs (do **not** disrupt) |
| App directory | `/opt/greenscape-quote-agent/` |
| systemd unit | `greenscape-quote-agent.service` |
| Internal port | `3100` (bound to `127.0.0.1` only — never directly exposed) |
| Reverse proxy | Caddy on `:443` (TLS) and `:80` (auto-HTTPS redirect) |
| DNS | Cloudflare zone `tunderman.cc`, A record (DNS-only / gray cloud) |
| Lifetime | Temporary — ~1 week. Tear down with `scripts/teardown.sh`. |

---

## Request path

```
browser
  └─ https://quote-agent.tunderman.cc
       │
       ▼
  Cloudflare DNS (gray cloud — DNS-only, no proxy)
       │  resolves A to 157.90.124.14
       ▼
  Hetzner Cloud Firewall (firewall-1)
       │  inbound ports allowed: 22, 80, 443
       ▼
  Caddy on :443  (TLS termination, Let's Encrypt cert)
       │  matches site block: quote-agent.tunderman.cc
       ▼
  reverse_proxy → 127.0.0.1:3100
       │
       ▼
  greenscape-quote-agent.service
       │  systemd, Type=simple, User=root, Restart=on-failure
       ▼
  node server.js   (Next.js 15 standalone)
       │  reads /opt/greenscape-quote-agent/.env (optional)
       ▼
  app
```

`:80` is identical except Caddy answers it for the Let's Encrypt HTTP-01 challenge and otherwise 308-redirects to `:443`.

---

## File layout on `157.90.124.14`

| Path | Owner | Purpose | Touched by |
|---|---|---|---|
| `/opt/greenscape-quote-agent/` | mixed (rsync preserves UID) | Next.js standalone runtime root | `scripts/deploy.sh` |
| `/opt/greenscape-quote-agent/server.js` | rsync uid | Standalone entry point produced by `next build` | `scripts/deploy.sh` |
| `/opt/greenscape-quote-agent/.next/` | rsync uid | Build output (server bundle + traced deps) | `scripts/deploy.sh` |
| `/opt/greenscape-quote-agent/.next/static/` | rsync uid | Hashed static assets — must live alongside `.next/` | `scripts/deploy.sh` |
| `/opt/greenscape-quote-agent/node_modules/` | rsync uid | Minimal standalone bundle (Next traces only what's used) | `scripts/deploy.sh` |
| `/opt/greenscape-quote-agent/public/` | rsync uid | Static `public/` assets (favicons, etc.) | `scripts/deploy.sh` |
| `/opt/greenscape-quote-agent/package.json` | rsync uid | Standalone metadata (`type` etc.) | `scripts/deploy.sh` |
| `/opt/greenscape-quote-agent/.env` | `root:root 0600` | Runtime env vars — **NEVER overwritten by `deploy.sh`** (`--exclude=.env`) | manual |
| `/etc/systemd/system/greenscape-quote-agent.service` | `root:root` | systemd unit | Chat C only |
| `/etc/caddy/Caddyfile` | `root:root` | Caddy global config (multiple sites; greenscape block lives between sentinel markers) | Chat C edits the block; never the other sites |

systemd unit ownership and the .env file ownership are intentionally `root:root`. The app dir + bundles are non-secret build artifacts so the rsync-preserved UID is harmless.

---

## DNS

- **Zone:** `tunderman.cc` (Cloudflare, `linda.ns.cloudflare.com` / `vicky.ns.cloudflare.com`)
- **Record:** `A quote-agent → 157.90.124.14`
- **Proxy status:** **DNS-only (gray cloud)** — required so Caddy can complete the Let's Encrypt HTTP-01 / TLS-ALPN challenge. If anyone toggles this to "proxied" (orange cloud), cert renewal will start failing within ~60 days and the site will eventually return TLS errors.
- **Comment on the record:** `L&S take-home temp deploy. Remove via scripts/teardown.sh.`

To inspect: `dig +short quote-agent.tunderman.cc` should always return `157.90.124.14`.

---

## Caddy site block

Lives in `/etc/caddy/Caddyfile` between **sentinel markers** so `scripts/teardown.sh` can remove it precisely:

```caddyfile
# >>> greenscape-quote-agent (TEMPORARY — L&S take-home, remove via scripts/teardown.sh) >>>
quote-agent.tunderman.cc {
    reverse_proxy localhost:3100
    encode gzip zstd
}
# <<< greenscape-quote-agent <<<
```

**Editing rules:**
1. Touch only the lines between the sentinel markers.
2. After any edit: `caddy validate --config /etc/caddy/Caddyfile`.
3. Apply with `systemctl reload caddy` — never `restart`. Reload is zero-downtime; restart drops connections for SchilderGroei and the lead websites.
4. If you need a backup before editing: `cp /etc/caddy/Caddyfile /tmp/Caddyfile.before-<timestamp>`. Several pre-change snapshots already exist in `/tmp/` from Chat C's prep.

---

## systemd unit

`/etc/systemd/system/greenscape-quote-agent.service`:

```ini
[Unit]
Description=Greenscape Quote Agent (Next.js standalone) - L&S take-home, temporary
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/greenscape-quote-agent
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3100
Environment=HOSTNAME=127.0.0.1
EnvironmentFile=-/opt/greenscape-quote-agent/.env

[Install]
WantedBy=multi-user.target
```

**Why these choices:**
- `User=root` — matches the existing SchilderGroei convention on this box. It's a temporary box, not worth introducing a new user.
- `HOSTNAME=127.0.0.1` — Next.js `next start` honors `HOSTNAME` and `PORT`. Binding to loopback means the only external entry point is Caddy, even if the Hetzner Cloud Firewall changes.
- `EnvironmentFile=-/opt/greenscape-quote-agent/.env` — the leading `-` makes the file optional. The service starts even without an `.env`; missing keys surface as runtime errors at first request, not boot.
- `Restart=on-failure` (not `always`) — if the unit exits 0 (graceful) we don't restart; if it crashes we do.
- The unit is **loaded but not enabled** by default, so it does **not** auto-start on reboot. Run `systemctl enable greenscape-quote-agent` if persistent boot is wanted.

**Common commands:**
```bash
systemctl status  greenscape-quote-agent          # is it running?
systemctl start   greenscape-quote-agent          # bring it up
systemctl restart greenscape-quote-agent          # after a deploy
systemctl stop    greenscape-quote-agent          # take it offline (URL → 502)
journalctl -u greenscape-quote-agent -f           # tail logs
journalctl -u greenscape-quote-agent --since "10 min ago"
```

---

## Deploy procedure

Use `scripts/deploy.sh` (written by Chat A). Two modes:

**From a workstation (default):**
```bash
./scripts/deploy.sh
```
Builds locally → rsyncs `.next/standalone/`, `.next/static/`, `public/`, `package.json` to `/opt/greenscape-quote-agent/` (excluding `.env`) → SSH-restarts the service → curl-checks `127.0.0.1:3100`.

**From the server itself:**
```bash
ssh root@157.90.124.14
cd /path/to/checkout
./scripts/deploy.sh --local
```
Same flow but skips the rsync hop.

**Behavior to know:**
- `rsync -az --delete --exclude=.env` — old build files are removed; **`.env` is preserved**.
- `next.config.js` must have `output: "standalone"` or there's no `.next/standalone/` to ship; deploy.sh aborts if it's missing.
- Restart is unconditional. If the new build fails to boot, systemd will retry 3× (per `Restart=on-failure` defaults) and then enter `failed` state — the URL will start 502'ing. Roll back by re-deploying a known-good git ref.

---

## `.env` file expectations

Lives at `/opt/greenscape-quote-agent/.env`, owned `root:root` mode `0600`. Not in git. Set up manually after the first deploy. Mirrors `.env.example` in the repo.

Currently expected keys (per Chat A's wiring):

| Key | Source | Required for |
|---|---|---|
| `ANTHROPIC_API_KEY` | `~/Desktop/system/credentials.md` (SchilderGroei key reused per STATUS Open Decision #1) | agent skill chain |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | credentials.md (shared instance) | DB access (server-side) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | credentials.md | client SDK init |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | credentials.md (verified domain `notifications.tunderman.io`) | proposal email send |
| `NEXT_PUBLIC_APP_URL` | `https://quote-agent.tunderman.cc` | absolute links in emailed PDFs |
| `GREENSCAPE_ROC_LICENSE`, `GREENSCAPE_INSURANCE` | research-driven defaults (D26-D30) | proposal generation |

Without these, the home page and read-only mock-backed pages still render (Chat B's `data/store.ts` has no env deps), but `POST /api/agent/draft` and the email-send endpoint will fail at runtime.

---

## How the front-end wiring affects what works on the live URL

Today (2026-05-05), Chat B's pages all read from `data/store.ts` (in-memory mocks). The real API routes (`/api/agent/*`, `/api/quotes/*`) are wired in code but not yet called by the UI. That has one important consequence for deployment:

> **A deploy that ships the current `main` branch will produce a fully browseable UI (mock-backed) on the public URL — even with a placeholder `.env`.** Real-DB persistence, Anthropic agent runs, and email send will only become reachable once Chat B switches `data/store.ts` to `fetch()` against the API contract.

When that switch happens, the live URL also requires (a) a populated `.env` and (b) the three `supabase/migrations/*.sql` files applied to the Supabase `greenscape` schema.

---

## Verification gate (after every deploy)

Always run all of these after a deploy. Don't ship without each one returning the expected result.

```bash
ssh root@157.90.124.14 'systemctl is-active greenscape-quote-agent'   # → active
ssh root@157.90.124.14 'curl -fsS http://127.0.0.1:3100 | head -c 200'  # → HTML

curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://quote-agent.tunderman.cc/   # → 200
echo | openssl s_client -servername quote-agent.tunderman.cc \
  -connect quote-agent.tunderman.cc:443 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates                                     # cert sane

# Sanity: SchilderGroei + lead-website services still healthy
ssh root@157.90.124.14 'for s in schildergroei-api schildergroei-web willemschilderwerken-api caddy; do echo $s $(systemctl is-active $s); done'
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| URL returns **502 Bad Gateway** | service is stopped or crashed | `systemctl status greenscape-quote-agent`; `journalctl -u greenscape-quote-agent -n 100` |
| URL returns **TLS error / cert untrusted** | Cloudflare proxy got toggled to "proxied" (orange cloud); HTTP-01 challenge fails | Set the DNS record back to "DNS only" in Cloudflare dashboard |
| URL returns **HTTP 200 from old build** | systemd was not restarted after rsync, or rsync filtered something out | `systemctl restart greenscape-quote-agent`; verify `ls -lt /opt/greenscape-quote-agent/server.js` post-deploy |
| `caddy validate` fails | edit broke syntax | revert and re-edit between the sentinel markers; never delete other site blocks |
| Port 3100 already in use | someone restarted the service mid-deploy or another process grabbed it | `ss -tlnp \| grep 3100` |
| Build crashes at startup with missing-env errors | `.env` is wrong / absent; some Chat A code path reads keys at boot | populate `.env`, `systemctl restart` |
| New deploy works but URL still shows hello-world | cached / DNS — but the standalone deploy fully replaces files, so this usually means the deploy didn't run | re-run `scripts/deploy.sh` and watch its "Service is responding" line |

---

## Isolation rules (server is shared)

This box runs SchilderGroei production + 4 lead-website APIs. **Do not** under any circumstance:

- Edit any non-greenscape Caddy site block.
- Touch any `schildergroei-*`, `willemschilderwerken-*`, `bossche-schilderwerken-*`, `schildersbedrijf-tijmen-*`, `veluws-schilderwerk-*` systemd units.
- Run `systemctl restart caddy` (use `reload`).
- Run `apt upgrade` or any system-wide package change.
- Modify `/etc/ssh/`, the firewall config, or the Hetzner Cloud Firewall rules without explicit user approval.
- Deploy to `/opt/schildergroei*` or `/var/www/*` — those are not ours.

Pre-change state snapshots from Chat C live in `/tmp/services-before.txt`, `/tmp/ports-before.txt`, `/tmp/Caddyfile.before`, `/tmp/Caddyfile.before-greenscape` for diff-after-the-fact verification.

---

## Teardown

Run `./scripts/teardown.sh` from a workstation. It is **idempotent** and **confirmation-gated** — every destructive step prompts before running. It:

1. Stops + disables + deletes `greenscape-quote-agent.service`
2. Removes `/opt/greenscape-quote-agent/`
3. Removes the Caddy site block (matched by sentinel markers); validates and reloads Caddy
4. Reminds you to delete the Cloudflare `quote-agent.tunderman.cc` A record (manual — no API token required)
5. Verifies SchilderGroei + lead-website services are still healthy

After step 4 completes, the URL stops resolving entirely. Until then, it will TLS-fail because there's no listener.

---

## Maintenance moving forward

If this deploy outlives the take-home demo and becomes longer-lived, here's what to revisit:

1. **Replace the reused SchilderGroei Anthropic key** with a project-scoped key — required by the credentials.md project-scoping rule. Update `.env` on the server, `systemctl restart`. No other change needed.
2. **Add `systemctl enable greenscape-quote-agent`** so the service comes back up after server reboots. Skipped intentionally for the temp-deploy phase.
3. **Add minimal access logs** if you ever need to debug who hit what. Caddy supports per-site logging via a `log` directive inside the site block; the format is JSON to stdout by default. No infra change required.
4. **Rotate the Cloudflare API token** — currently `~/.zshrc` and `credentials.md` have a token returning `9109 Invalid access token` for the Zones API. Not blocking (DNS was added manually) but worth fixing so future automation can write DNS without the manual step.
5. **Promote DNS to "proxied" (orange cloud) only after** issuing a Cloudflare Origin Certificate and configuring Caddy with it — otherwise auto-Let's-Encrypt breaks. For a 1-week deploy, gray cloud + Caddy LE is the simpler win.
6. **Daily deploy reality check.** Until Chat B switches `data/store.ts` away from mocks, `scripts/deploy.sh` shipping does not exercise Chat A's API or Supabase migrations. Don't conflate "deploy succeeded" with "agent works end-to-end" — the integration test is a separate gate.
7. **Watch the cert renewal window.** Caddy will refresh ~30 days before `notAfter`. If the renewal fails (most likely cause: DNS toggled to proxied), `journalctl -u caddy --since "1 day ago"` will show the LE error. Set DNS back to gray cloud and `systemctl reload caddy`.

---

## Where Chat C's work lives in this repo

| Path | Purpose |
|---|---|
| `docs/12-deployment.md` | this file — canonical deployment reference |
| `scripts/teardown.sh` | end-of-demo cleanup |
| `STATUS.md` (Chat C row, Deploy URL, Recent completions) | live state |

Everything else on the server side (the systemd unit, the Caddy block, the DNS record, the deploy-target dir) is on `157.90.124.14`. There is no Chat C source code to "deploy"; this layer is config + docs.
