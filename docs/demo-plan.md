# Penetron — Demo Plan (recording-ready)

The authoritative plan for the ≤5-min submission video. Built around what **reliably works**, with
UiPath as the hero and GitHub as the reach surface. Target run time **~4:30** (leave buffer under 5:00).

---

## 0. Pre-flight checklist (do before recording)

**Local stack (one terminal each, leave open):**
- [ ] Target app: `cd target-app && PORT=4000 node server/index.js` → "listening on :4000"
- [ ] MCP server: `cd pentests && PENETRON_MCP_TRANSPORT=http PENETRON_MCP_PORT=7337 PENETRON_MCP_ALLOWED_ACCOUNT=9d5888d3-00a1-4e5a-8702-78ace2906474 ./node_modules/.bin/tsx src/mcp/server.ts` → "[auth on]"
- [ ] Tunnel: `cloudflared tunnel --url http://localhost:7337 --protocol http2` → copy the URL
- [ ] Orchestrator → **Penetron** folder → MCP Servers → **Penetron-MCP-2** → Remote URL = `<new-tunnel>/mcp` → Update
- [ ] `SLACK_WEBHOOK_URL` set in `pentests/.env`

**Browser tabs ready (logged in):**
- [ ] Studio Web → the **Penetron Coordinator agent** (Definition view)
- [ ] UiPath **Test Manager → PEN dashboard**
- [ ] GitHub → **PR #1** (`demo/search-sort-pr`) — the blocked PR
- [ ] Slack channel (where the webhook posts)
- [ ] (optional) Studio Web → the **Maestro canvas** (Penetron Security Gate) for the design shot

**Sanity check the agent reaches the engine (don't record):** run one agent Debug → confirm ~48s + `tools/call` in the MCP terminal. If green, you're clear to record.

> ⚠️ **Do NOT** re-publish the Maestro solution on camera (preview pack bug). Show the Maestro **canvas** only, or use the already-recorded green run as b-roll.

---

## 1. Run-of-show (6 shots)

### Shot 1 — The problem (0:00–0:30) · slide/talking head
> "Security scanners flag hundreds of *possible* vulnerabilities. Teams drown in noise and real bugs get buried. Penetron is different — it reports **only what it actually exploited**."
- On screen: title slide + the line **"Flagged 7 → proved 6, discarded 1."**

### Shot 2 — The target (0:30–1:00) · `target-app/VULNS.md`
> "We attack an owned, intentionally-vulnerable staging app — 6 planted OWASP bugs and one safe control. The only thing Penetron touches."
- On screen: scroll `VULNS.md` (the 6 exploitable + the safe control).

### ⭐ Shot 3 — UiPath agent verifies the code, LIVE (1:00–2:30) · Studio Web + MCP terminal
> "Layer 2 is a UiPath **Agent Builder** agent — Claude Sonnet — that calls Penetron's tools over a **Remote MCP server** and runs *real* exploits against the running app."
- Click **Debug on cloud** on the agent. Inputs: `targetUrl=http://localhost:4000`, `mode=replay`.
- **Cut to the MCP-server terminal**: show `tools/call` firing (run_exploits → generate_reports → get_gate → sync_test_manager).
- Back to the agent output: **`content = OPEN_TICKET`, 6 exploited / 1 discarded**, the verdict list.
> "Six proven exploits, one safe control correctly discarded — no false positives."

### Shot 4 — Test Manager evidence (2:30–3:15) · PEN dashboard
> "Every proven exploit becomes a red test result in **UiPath Test Manager**; the safe control is green. This is the audit-grade evidence locker."
- On screen: the execution row — **6 Failed / 1 Passed** — open it to show the cases (+ a trace/screenshot if handy).

### ⭐ Shot 5 — It blocks a real PR (3:15–4:15) · GitHub PR #1
> "Penetron meets developers at the pull request. Here a developer's change touched `/api/search` — Penetron proved a SQL injection and the required check went red."
- On screen: PR #1 → the **red `penetron` check** → **"Merge blocked"** → the comment *"flagged 1 → proved 1 → OPEN_TICKET."*
> "Two surfaces, same engine: a fast GitHub-native check for reach, and the UiPath-governed pipeline for depth and evidence."  *(Honest framing — don't call the GitHub check "UiPath".)*

### Shot 6 — Governance + Slack + bonus + close (4:15–4:45)
> "Before anything is sent, a human approves — the governance checkpoint. Maestro keeps the full audit trail, and Slack gets a prioritized summary."
- On screen: the **Slack** message; a glance at the **Maestro canvas**.
> "And Claude Code is Penetron's brain *and* built the whole thing — the engine, the MCP server, and it drove the UiPath GUI to deploy the agent."
- Close on the line: **"Penetron — proves exploitability, filters the noise, lets UiPath govern the fix."**

---

## 2. What to AVOID showing live (fragile)
- ❌ Re-publishing the Maestro solution (preview pack bug). Canvas/b-roll only.
- ❌ The GHA→UiPath live auto-trigger (parked — runtime/Maestro platform limits). Mention as roadmap if at all.
- ❌ Claiming the GitHub PR check *is* UiPath. It's the reach surface; the UiPath proof is Shots 3–4.

## 3. Insurance capture (do FIRST, before the full take)
The single most important clip is **Shot 3 (agent Debug)** — it's live right now. **Record it immediately** as a standalone clip so you have proof-of-UiPath even if something churns later. Also screenshot: the **TM execution**, the **blocked PR**, the **Slack message**.

## 4. Recording tips
- 1080p+; hide secrets (don't show `.env` or the bearer on screen).
- Keep narration tight — practice once; the agent run (~48s) is the natural pacing anchor (talk over it).
- Trim dead time during installs/loads in post.
- Put the **repo link + "Track 3"** on the closing slide.

## 5. Required deliverables checklist
- [ ] **Video** (≤5 min, this plan) → upload, link in Devpost + README
- [ ] **Deck** (`docs/deck.md` → slides) → export PDF, link in Devpost
- [ ] **Devpost writeup** (`docs/devpost-writeup.md`) → paste into project page
- [ ] **Public repo** (done) + MIT license (done)
- [ ] Confirm repo is **public** and README is current
