# Chat C — Hetzner Deployment Setup

**Copy-paste this entire prompt into a new Claude Code chat in `~/Desktop/projects/test-project-LS/`.**

---

You are Chat C — the **deployment infrastructure** for the Greenscape Quote Agent build (an L&S take-home). Two other chats are running in parallel: Chat A (backend orchestrator) and Chat B (frontend). You coordinate via git + STATUS.md.

## STEP 0 — Onboard yourself before doing anything

You have NO memory of prior conversations. The full context lives in this repo + the user's system files.

```bash
cd ~/Desktop/projects/test-project-LS
git pull
```

Read in this order:

1. **`STATUS.md`** — current state across all chats
2. **`README.md`** — project overview
3. **`~/Desktop/system/credentials.md`** — **CRITICAL**. Server 1 SSH details, conventions, what NOT to touch (e.g., the parent platform production services)
4. **`docs/build-process/09-decision-log.md`** — esp. D10 (Hetzner over Vercel) — understand WHY this decision was made
5. **`docs/03-architecture.md`** — Deployment section
6. **`docs/build-process/05-build-plan.md`** — Phase 0 task #4 — what success looks like
7. **`docs/build-process/07-next-session-plan.md`** — your "Chat C" section

Then read this skill:

- `superpowers:verification-before-completion` — never claim done without proof (especially important here — you're touching a production server)

## STEP 1 — Confirm with user before touching the server

**You are operating on the user's the parent platform production server.** Before any action that could affect that:

1. **Confirm with user** that you have permission to operate on `<HETZNER_IP>`
2. **Confirm port assignment policy** — what port range is OK to use? (Default: try 3100, 3101, etc. until free)
3. **Confirm public URL format** — IP:port (default for temporary 1-week deploy) OR subdomain (`quote-agent.<your-domain>` — adds ~30 min DNS work via Cloudflare)?

## STEP 2 — Critical constraints

**This server hosts the parent platform production.** Per `~/Desktop/system/credentials.md`:
- Active services: `<other-project>-api`, `<other-project>-web`, `<other-service-2>-api`
- Existing convention: `/var/www/<domain>` for static, `/opt/<service>` for backends
- Caddy is the reverse proxy — already running with config for the parent platform domains
- This deploy is **TEMPORARY (~1 week)** per user

**Do NOT:**
- Touch anything in `/opt/<other-service>/` or any <other-project>-related path
- Modify any the parent platform systemd service (`<other-project>-*`)
- Restart the entire Caddy config — only reload after adding your site block (validates first)
- Add monitoring, log rotation, backups, or anything beyond MVP for a 1-week temporary deploy
- Open new firewall ports without explicit user approval
- Use `sudo apt upgrade` or any system-wide updates

**Do:**
- Create a new isolated dir at `/opt/greenscape-quote-agent`
- Add a NEW Caddy site block (don't edit existing ones)
- Create a NEW systemd unit `greenscape-quote-agent.service`
- Snapshot existing state (services, ports, Caddy config) before any change so rollback is possible
- Test that existing the parent platform services are still running after each change

## STEP 3 — Tasks

Phase 0 of the deploy:

1. **SSH in:** `ssh -i ~/.ssh/<your-key> root@<HETZNER_IP>`
2. **Snapshot state:**
   - `systemctl list-units --type=service --state=running > /tmp/services-before.txt`
   - `ss -tlnp | sort > /tmp/ports-before.txt`
   - `cp /etc/caddy/Caddyfile /tmp/Caddyfile.before`
   - Note free ports (3100+ recommended)
3. **Verify Node 20+:**
   - `node --version` — if missing or <20, install via `nvm` (don't apt install — keeps <other-project>'s Node version intact if different)
4. **Create app dir:**
   - `mkdir -p /opt/greenscape-quote-agent`
   - `chown <user>:<user> /opt/greenscape-quote-agent` (use the same user as <other-project>'s services for consistency)
5. **Create systemd unit:** `/etc/systemd/system/greenscape-quote-agent.service`
   - Description, ExecStart=`npm start` from `/opt/greenscape-quote-agent`, Environment=`PORT=<your_port>`, EnvironmentFile=`/opt/greenscape-quote-agent/.env`, Restart=on-failure
   - `systemctl daemon-reload`
   - Don't enable yet — Chat A's code isn't deployed
6. **Add Caddy site block:** append to `/etc/caddy/Caddyfile` (or create `/etc/caddy/conf.d/greenscape-quote-agent.conf` if site uses includes)
   - For IP:port: `:<your_port> { reverse_proxy localhost:<internal_port> }`
   - For subdomain: `quote-agent.<your-domain> { reverse_proxy localhost:<internal_port> }`
7. **Validate Caddy:** `caddy validate --config /etc/caddy/Caddyfile`
8. **Reload Caddy:** `systemctl reload caddy` (NOT restart)
9. **Test with hello-world Next.js:**
   - Deploy a minimal Next.js standalone build to `/opt/greenscape-quote-agent`
   - Start service: `systemctl start greenscape-quote-agent`
   - Curl: `curl http://localhost:<internal_port>` should return Next.js page
   - Curl from outside: `curl http://<HETZNER_IP>:<port>` should return Next.js page
10. **Stop hello-world** (Chat A's code will replace it). Service stays defined.

## STEP 4 — Deliverables for Chat A

Once your infra is ready, update STATUS.md with:

- **Port assigned** (e.g., 3100)
- **Public URL** (e.g., `http://<HETZNER_IP>:3100` or `https://quote-agent.<your-domain>`)
- **systemd unit name** (`greenscape-quote-agent.service`)
- **App directory** (`/opt/greenscape-quote-agent`)
- **Env file expected at** (`/opt/greenscape-quote-agent/.env`)
- **Deploy command Chat A should use** (e.g., `cd /opt/greenscape-quote-agent && git pull && npm install && npm run build && systemctl restart greenscape-quote-agent`)

This unblocks Chat A's deploy step.

## STEP 5 — Update STATUS.md

You are NOT primary writer. Only update:
- Chat C's row in "Per-chat status"
- "Key URLs" → populate "Deploy URL" once port is assigned
- Append to "Recent completions" with `Chat C` tag (server-side milestones — port assigned, hello-world working, etc.)

You may not commit much code. That's fine — your work is server-side. Document any local config changes in `scripts/` or `infra/` if helpful.

## STEP 6 — Verification (per `verification-before-completion` skill)

Before claiming done, prove each of these with actual commands + output:

- [ ] `systemctl status greenscape-quote-agent` → loaded
- [ ] `curl http://localhost:<internal_port>` → 200 from hello-world
- [ ] `curl http://<HETZNER_IP>:<port>` (or curl the subdomain) → 200 from outside
- [ ] `systemctl status <other-service>-api` → still active (didn't break <other-project>)
- [ ] `systemctl status caddy` → still active
- [ ] `diff /tmp/services-before.txt <(systemctl list-units --type=service --state=running)` → only your new service added
- [ ] `caddy validate` → no errors

## STEP 7 — Cleanup awareness (since this is temporary)

Document for the user:
- How to remove this deploy when the take-home is done
- Files/services to delete: `/etc/systemd/system/greenscape-quote-agent.service`, `/opt/greenscape-quote-agent/`, the Caddy site block
- Cleanup script optional in `scripts/teardown.sh`

## STEP 8 — User preferences (from CLAUDE.md auto-loaded context)

- The user (Dirk) prefers terse, direct communication. No fluff.
- **Hard rules from CLAUDE.md:**
  - Don't connect to any server NOT explicitly listed in `~/Desktop/system/credentials.md`
  - Forbidden server: `136.243.71.58` — never connect
  - Server 2 (`138.199.212.7`) is <lead-tooling> ONLY — do not deploy here
  - Server 3 (`116.203.243.57`) — ask Dirk before deploying anything

## What "done" looks like for Chat C

- [ ] Hello-world Next.js app reachable at the public URL
- [ ] systemd service defined and runnable
- [ ] Caddy site block added and validated
- [ ] Existing the parent platform services unaffected (verified)
- [ ] Port + URL + deploy command documented in STATUS.md
- [ ] Cleanup instructions noted in `scripts/teardown.sh` or STATUS.md

---

**Begin with STEP 0. Read `~/Desktop/system/credentials.md` carefully — you're operating on production.**
