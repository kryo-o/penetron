# Penetron — Agentic Penetration Testing, Governed by UiPath

[![Penetron PR Security Gate](https://github.com/kryo-o/penetron/actions/workflows/penetron-pr.yml/badge.svg)](https://github.com/kryo-o/penetron/actions/workflows/penetron-pr.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **SAST tools drown teams in unproven findings. Penetron reports only what it has actually exploited.**
> Static analysis proposes *candidates*; a dynamic agent **proves or discards** each one against the running app,
> then UiPath orchestrates, governs, and records the evidence. *"Flagged 7 → proved 6, discarded 1."*

Penetron shifts security from a late-stage manual checkpoint into a continuous, **governed gate** in the SDLC.
On a deploy to dev/QA/staging it analyzes the change, **proves exploitability** against the running app,
reports only the vulnerabilities it actually exploited, syncs red/green evidence to **UiPath Test Manager**,
and notifies Slack — all orchestrated by **UiPath Maestro**, with a human-approval checkpoint as the designed governance gate (Action Center; blocked on tenant provisioning — see [Status](#live-status-verified)). *(Automated defect ticketing, e.g. Jira, is on the [v2 roadmap](#roadmap-v2).)*

Built for the **UiPath AgentHack — Track 3** (agentic software testing with UiPath Test Cloud).

> ⚠️ **Authorized, defensive security testing only.** Penetron runs against an **owned, intentionally-vulnerable
> demo app** in a non-production environment. That target app must **never** be deployed to production or exposed
> publicly. All secrets live in environment variables / Orchestrator Assets — never hardcoded.

---

## Agent Type

**Agent Type: Low-code Agent.** Penetron's `Penetron Coordinator` is a **UiPath Agent Builder** Low-code Agent
(Claude Sonnet 4.6, temperature 0) that calls Penetron's exploit engine over a **Remote MCP server** and
interprets the structured verdicts. Penetron does **not** use a UiPath **Coded Agent** — the exploit engine is
external TypeScript/Playwright, exposed to the agent via MCP rather than hosted as a UiPath coded agent.
Separately, **Claude Code** (a coding agent) was used at *build* time — see
[Coding agent](#coding-agent-the-bonus--claude-code) (the bonus).

---

## What it does (the flow)

```
GitHub PR (UiPath GitHub connector trigger)  ·  or deploy / Slack / manual
  → UiPath Maestro (BPMN · orchestration · governance · audit)
     → Layer 1  Claude Code SAST + PR impact analysis      → candidate findings
     → Layer 2  Agent Builder agent → Penetron MCP →        → proven verdicts
                TS/Playwright exploit validation               + Test Manager evidence
     → Exploitability gate  (only exploited == true advances)
     → Two reports  (Exploitable Vulnerabilities · Suggested Improvements)
     → Human approval  (designed governance checkpoint — Action Center; see Status)
     → Slack notification   (automated defect ticketing → v2 roadmap)
```

The differentiator is **Layer 2**: a UiPath **Agent Builder** agent calls Penetron's exploit engine over a
**Remote MCP server** and runs real attacks (SQLi, XSS, IDOR/BOLA, broken-auth) against the running target,
asserting on an **exploitation signal** (payload renders unescaped, auth bypassed, cross-user object returned 200)
— not a source string-match. Every verdict lands in Test Manager as a red (exploited) or green (resisted) result.

---

## UiPath components used

| Component | Role in Penetron |
|---|---|
| **Maestro** (BPMN) | The hero orchestrator — `Penetron Security Gate` process: Start → Validate exploits (agent) → exploitability gate → (approval) → end. Provides the audit trail + governance. |
| **Agent Builder** | `Penetron Coordinator` agent (Claude Sonnet 4.6, autonomous, temp 0) — calls Penetron's MCP tools and interprets the structured verdicts. |
| **Remote MCP Server** | Bridges the cloud agent to Penetron's local TS/Playwright engine (7 tools: run_exploits, generate_reports, get_gate, sync_test_manager, run_full_pipeline, file_jira_ticket, notify_slack). |
| **Test Manager / Test Cloud** | System of record for evidence — each run creates a test set + execution (Failed = exploit proven, Passed = safe control resisted). |
| **Orchestrator** | Solution packaging/deployment, folders, MCP server registry, (Assets for secrets — hardening). |
| **Action Center** | Human-approval User Task before any external write — **designed, not live**: the approval app was built, but Maestro→AppTasks returned 404 (Action Center not provisioned for the debug identity), so the node was removed from the green run. See Status / `PROJECT-PLAN.md` M8e. |

## Agents — UiPath classification

See [Agent Type](#agent-type) above: Penetron is a **Low-code Agent** (UiPath Agent Builder), **not** a Coded
Agent. The coding-agent bonus (Claude Code at build time) is described next.

## Coding agent (the bonus) — Claude Code

Claude Code is used in **two distinct roles**:

- **Role A — Penetron's brain (the product):** SAST + PR impact analysis (Layer 1), exploit scenario
  generation + interpretation (Layer 2), two-report generation. It drives **Playwright** for browser exploits.
- **Role B — build-time platform engineer (the +2 bonus):** Claude Code scaffolded the repo, built the
  TS/Playwright engine and MCP server, wired the Test Manager S2S sync, and drove the UiPath Studio Web / Orchestrator
  GUI (via Playwright MCP) to register the MCP server, bind the agent, and publish + run the Maestro process.

Evidence: [`docs/coding-agent-evidence/`](docs/coding-agent-evidence/).

---

## Live status (verified)

| Capability | Status | Evidence |
|---|---|---|
| Vulnerable target app (Express + React, 6 planted OWASP bugs + safe control) | ✅ | `target-app/VULNS.md`; `npm run smoke` → 8/8 |
| **Layer 1 — SAST + change-impact (diff-driven)** | ✅ | `npm run layer1` → reads the PR diff, emits candidate findings scoped to the change; schema-valid |
| **On-PR trigger (GitHub Action)** | ✅ | `.github/workflows/penetron-pr.yml` → Layer 1 → Layer 2 → PR comment "flagged N → proved X, discarded Y" |
| Layer 2 exploit runner (TS + Playwright, replay + regenerate) | ✅ | `npm run exploit` (replay) / `npm run exploit:pr` (regenerate) → **6/7 proven, 1 discarded**, schema-valid |
| Exploitability gate + two reports | ✅ | `npm run report` → `OPEN_TICKET`, priority `Highest` |
| Slack integration | ✅ LIVE | Block Kit summary posts to the channel on a finding |
| **Test Manager S2S sync** | ✅ LIVE | our UiPath staging tenant, project **PEN**; executions `f689d631…`, `fe3f6e8d…`, `47c525b7…` (6 Failed / 1 Passed each) |
| **Remote MCP server** (7 tools, stateful, dual-auth) | ✅ LIVE | `npm run mcp:http`; agent calls it through a cloudflared tunnel |
| **Agent Builder coordinator → MCP** | ✅ LIVE | Debug run ~48s → real exploits → TM execution |
| **Maestro process published + run green** | ✅ LIVE | solution v1.0.6; instance: Start → Validate exploits → End, Successful; `content = OPEN_TICKET` |
| **PR → UiPath trigger (GitHub connector → Maestro)** | ✅ LIVE | GitHub **Pull Request Created** (Integration Service, polling) auto-starts `Penetron Security Gate` → Successful (1m13s) → new TM execution `47c525b7…` (6 Failed / 1 Passed), 2026-06-28 |
| Action Center human approval | ⛔ | designed; approval app built, but Maestro→AppTasks 404 (not provisioned for the debug identity) so it was removed from the green run — see `PROJECT-PLAN.md` (M8e) |
| Triggers — GitHub PR (UiPath connector) ✅ · deploy webhook + Slack `/pentest` ⏳ | 🟢 | GitHub PR trigger LIVE (row above); deploy webhook + Slack slash still planned |

See [`PROJECT-PLAN.md`](PROJECT-PLAN.md) for the full milestone tracker and [`docs/architecture.md`](docs/architecture.md)
for the design.

---

## Setup from scratch (for judges)

Penetron has **two paths**, both fully documented:

- **Path A — Local pipeline** (Layers 1 + 2, exploitability gate, reports). Runs from a clean clone with
  **no UiPath account and no credentials** — the self-contained path you can reproduce immediately. Steps below.
- **Path B — Full UiPath stack** (Maestro → Agent Builder → Remote MCP → Test Manager): the complete governed
  experience, **built step by step** below. It **requires** a UiPath tenant (Agent Builder + Test Manager +
  Maestro + Integration Service), `cloudflared`, the `.env` credentials, and **creating the Remote MCP server,
  agent, BPMN, and GitHub trigger** in UiPath. See
  [Path B — Full UiPath stack](#path-b--full-uipath-stack-maestro--agent--mcp--test-manager).

## Path A — Local pipeline (no UiPath account, no credentials)

**0. Prerequisites** — **Node 22+** (the target app uses the built-in `node:sqlite`; tested on Node 24) and `git`.
*(Path B additionally needs a UiPath tenant and `cloudflared` — see that section.)*

```bash
# 1) Clone the repo
git clone https://github.com/kryo-o/penetron.git
cd penetron

# 2) Create the env file (single file at the repo root)
cp .env.example .env
#    Path A needs NO credentials — the defaults are fine. The live integrations
#    (Test Manager / MCP / Slack — all Path B) need values; see "Environment variables".

# 3) Start the target app (intentionally vulnerable) — http://localhost:4000
#    This BLOCKS — leave it running; use a SECOND shell for steps 4–5.
cd target-app && npm install && npm run build:client && npm start

# 4) (verify) Prove the planted bugs fire — second shell, from the repo root
cd target-app && npm run smoke                 # 8 passed, 0 failed

# 5) Run Penetron — second shell (target app from step 3 must be running)
cd pentests && npm install && npm run pw:install
npm run exploit      # 6/7 proven exploitable, 1 safe control resists
npm run report       # exploitability gate -> OPEN_TICKET + two reports
```

That's the full local proof. To also run the integrations end-to-end use `npm run pipeline`
(exploit → report → Test Manager sync → Slack notify) — fill `.env` first; `tm:sync` and `slack`
dry-run without credentials. Artifacts land in `pentests/evidence/` (listed below). **For the full
governed experience, continue to
[Path B — Full UiPath stack](#path-b--full-uipath-stack-maestro--agent--mcp--test-manager).**

### Run it as it runs on a PR (Layer 1 → Layer 2)

```bash
cd pentests
npm run layer1                              # SAST on the diff -> PR-scoped candidate findings
npm run exploit:pr                          # prove/discard ONLY those candidates (regenerate mode)
npm run report                              # gate -> OPEN_TICKET
# or all three:  npm run pr
# scope to a real diff:  PENETRON_DIFF_RANGE=origin/main...HEAD npm run layer1
```

On GitHub, `.github/workflows/penetron-pr.yml` runs this automatically on any PR touching
`target-app/**` and posts the results as a PR comment. See [`docs/pr-flow.md`](docs/pr-flow.md).

Artifacts land in `pentests/evidence/`: `verdicts.json`, `exploitable-vulnerabilities.md`,
`suggested-improvements.md`, `gate-summary.json`, XSS screenshots + Playwright traces,
`slack-message.json`, `tm-sync-result.json`.

## Path B — Full UiPath stack (Maestro → Agent → MCP → Test Manager)

The full governed experience: a UiPath **Maestro** process starts an **Agent Builder** agent that calls Penetron's
engine over a **Remote MCP server** (through a tunnel) and writes red/green evidence to **Test Manager** — and a
**GitHub Pull Request** auto-starts the whole thing via the **Integration Service** GitHub connector. The steps
below (B0–B7) are exactly how this build was created, each linking the official UiPath doc and the matching repo spec.

> **Proof-of-concept tunnel.** The `trycloudflare` quick tunnel is a zero-setup convenience for this hackathon
> build — it lets the UiPath cloud agent reach a **locally-running** MCP server with no account or DNS. Quick-tunnel
> URLs rotate, so you re-point UiPath each run (B6). **In the production version the MCP server runs at a permanent
> URL** (a named cloudflared tunnel, a reserved domain, or a hosted endpoint), removing the re-point step.

### B0. Prerequisites
- A UiPath tenant with **Agent Builder**, **Test Manager**, **Maestro**, and **Integration Service** (this build
  used a `staging.uipath.com` tenant; substitute your own org/tenant).
- [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed.
- Repo-root `.env` filled in: `PENETRON_MCP_TOKEN`, `PENETRON_MCP_ALLOWED_ACCOUNT` (your UiPath org id), and the
  `UIPATH_TM_*` Test Manager S2S creds (see [Environment variables](#environment-variables) / `.env.example`).

### B1. Start the local bridge (target app + MCP server + tunnel)
```bash
./scripts/start-stack.sh    # target app (:4000) + MCP server (:7337) + cloudflared tunnel
```
It prints a **public MCP URL** like `https://<random>.trycloudflare.com/mcp` — you paste this into UiPath in B2.
Manual alternative (two shells): `cd pentests && npm run mcp:http` (stateful Streamable HTTP on `:7337/mcp`;
`npm run mcp:smoke:http` to verify), then `cloudflared tunnel --url http://localhost:7337 --protocol http2`.

### B2. Register the Remote MCP Server in Orchestrator
- **Orchestrator → your Solution folder → MCP Servers → Add.**
- **Type = Remote**, **Name** `Penetron`, **Remote URL = `<tunnel>/mcp`** (⚠ must end in `/mcp` — a bare host 404s),
  **Headers** `{"Authorization":"Bearer <PENETRON_MCP_TOKEN>"}` (header values containing `token`/`secret` auto-mask).
- **Save** → the **7 tools auto-discover**.
- Gotcha: don't delete + recreate the server (it spawns duplicate slugs like `Penetron_1` and breaks the agent's
  tool binding) — to change the URL later, Edit → Update (see B6).
- Docs: [About MCP Servers](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-mcp-servers) ·
  [Managing MCP Servers](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/managing-mcp-servers).
  Repo spec: [`uipath/mcp/register-remote-mcp.md`](uipath/mcp/register-remote-mcp.md).

### B3. Create the Penetron Coordinator agent + bind the MCP tools
- **Agent Builder → new agent** named `Penetron Coordinator`; model **Claude Sonnet 4.6**, **temperature 0**.
- Paste the **system prompt** and **output contract** from
  [`uipath/agents/penetron-coordinator.agent.md`](uipath/agents/penetron-coordinator.agent.md).
- **Add tool → MCP Server → `Penetron` → select the tools** the agent may call: `run_exploits`,
  `generate_reports`, `get_gate`, `sync_test_manager` (`run_full_pipeline` optional). You **must** explicitly
  select them — an empty list shows "No available tools" at runtime.
- **Debug** (~48s) → real exploits → a new Test Manager execution (project **PEN**), 6 Failed / 1 Passed.
- Docs: [Building an agent](https://docs.uipath.com/agents/automation-cloud/latest/user-guide/building-an-agent-agent-builder) ·
  [Add MCP servers as tools](https://docs.uipath.com/agents/automation-cloud/latest/user-guide/mcp-servers).

### B4. Build the Maestro BPMN process (Penetron Security Gate)
In **Maestro**, in the **same Solution** as the agent:
- **Start event → Agent task** ("Validate exploits", *Start and wait for agent* = **Penetron Coordinator**; bind
  the agent output to a process variable `content`).
- **→ Exclusive gateway** on `content`, condition `vars.content.includes("OPEN_TICKET")` → branch to **End** events.
- **Publish** the solution and run an instance — it goes green (`content = OPEN_TICKET`, 6 exploited / 1 discarded).
- Gotcha: make sure the **Start → task sequence flow is actually connected** (a detached flow runs only the Start
  event and finishes in ~0.5s). The **Action Center** human-approval node is **designed but skipped** on this
  tenant (Maestro→AppTasks 404 — see [`PROJECT-PLAN.md`](PROJECT-PLAN.md) M8e and the
  [Live status](#live-status-verified) table).
- Docs: [Implementing a simple process](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/how-to-simple-process) ·
  [Gateways & flow logic](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/gateways-flow-logic).
  Repo spec: [`uipath/maestro/penetron-process.md`](uipath/maestro/penetron-process.md).

### B5. Wire the GitHub PR trigger (Integration Service, OAuth)
- **Integration Service → Connections → GitHub → add connection** via **OAuth 2.0 Authorization Code** (sign in to
  GitHub and authorize the UiPath app).
- In the Maestro process, make the **Start event a Message Start Event** bound to the GitHub connector event
  **"Pull Request Created"** (polling, ~5 min) on `kryo-o/penetron`. Opening a PR now auto-starts the gate.
- Gotcha: the trigger only catches PRs created **after** the solution is (re)published — open a **fresh** PR to
  test. The run still bridges through the local MCP stack, so keep B1 up and the Remote URL current (B6).
- Today the merge-blocking check is the GitHub Action (`penetron`); the **UiPath→GitHub commit-status callback**
  (so the UiPath verdict itself blocks the merge) is on the [v2 roadmap](#roadmap-v2).
- Docs: [About the GitHub connector](https://docs.uipath.com/integration-service/automation-cloud/latest/user-guide/uipath-microsoft-github) ·
  [GitHub authentication](https://docs.uipath.com/integration-service/automation-cloud/latest/user-guide/uipath-microsoft-github-authentication).
  Repo spec: [`docs/pr-uipath-flow.md`](docs/pr-uipath-flow.md).

### B6. Re-point the tunnel each run ⚠️ (trycloudflare rotates)
`trycloudflare` URLs **rotate on every start**, so after each `start-stack.sh` the agent hits a stale URL (502)
until you re-point it. **Just update the URL — do *not* delete/recreate the server:**
- **Orchestrator → MCP Servers → `Penetron` → Edit** → set **Remote URL** = the new `…/mcp` (keep the bearer
  header) → **Update / Save**. *(Just save — you don't need the "Connect to MCP" button; the 7 tools re-discover.)*
- In the agent, **Refresh tools** so it picks up the new URL.

### B7. Run it & verify
- **Agent only:** open `Penetron Coordinator` → **Debug** (calls `run_exploits → generate_reports → get_gate →
  sync_test_manager`); a new execution appears in Test Manager (project **PEN**), 6 Failed / 1 Passed.
- **Full process:** run `Penetron Security Gate` — either **open a Pull Request** (the live GitHub-connector trigger
  picks it up on its ~5-min poll) or start it manually from Orchestrator → the Solution folder → Processes.
- **Verify:** Test Manager → project **PEN** dashboard shows the new execution; see
  [`docs/evidence.md`](docs/evidence.md) for the reference run.

---

## Environment variables

One `.env` at the **repo root** (`cp .env.example .env`). Core Layer 1/2 needs **none** of these; the
groups below are only for the live integrations. Full template + comments in [`.env.example`](.env.example).

| Variable | Required for | Default |
|---|---|---|
| `PENETRON_TARGET_URL` | core run (target app URL) | `http://localhost:4000` |
| `PENETRON_ENV` · `PENETRON_MODE` | core run | `staging` · `replay` |
| `UIPATH_IDENTITY_TOKEN_URL` | Test Manager sync | `…/identity_/connect/token` |
| `UIPATH_TM_BASE_URL` · `UIPATH_TM_CLIENT_ID` · `UIPATH_TM_CLIENT_SECRET` · `UIPATH_TM_PROJECT_ID` | **live Test Manager evidence** (else `tm:sync` dry-runs) | — |
| `PENETRON_MCP_TOKEN` | MCP HTTP transport (bearer) | — |
| `PENETRON_MCP_ALLOWED_ACCOUNT` | **cloud agent path** (your UiPath org id; agenthub `accountid`) | — |
| `PENETRON_MCP_TRANSPORT` · `PENETRON_MCP_PORT` | MCP server | `stdio` · `7337` |
| `SLACK_WEBHOOK_URL` | Slack notify (optional; else dry-run) | — |
| `JIRA_*` | Jira ticketing (v2 prototype; optional) | — |
| `UIPATH_ORG_URL` · `UIPATH_ORCH_CLIENT_ID` · `UIPATH_ORCH_CLIENT_SECRET` · `UIPATH_FOLDER_ID` · `UIPATH_PROCESS_NAME` | **optional** — classic `npm run uipath:trigger` only (the live PR trigger needs none) | — |

Secrets live in `.env` (git-ignored) locally and in **Orchestrator Credential Assets** in production — never hardcoded.

---

## Repo layout

```
penetron/
├── target-app/        # intentionally-vulnerable Node/Express + React app + VULNS.md (ground truth)
├── engine/            # contract JSON schemas (finding · attack-surface · verdict) + Layer 1 replay output
├── pentests/          # TypeScript + Playwright exploit engine, gate, reports, integrations, MCP server
│   └── src/mcp/       # Remote MCP server (server.ts) + 7 tool implementations (tools.ts)
├── uipath/            # Maestro process spec, Agent Builder agent spec, MCP registration notes
└── docs/              # architecture, PR flow, coding-agent evidence, integration plan
```

## Roadmap (v2)

Out of scope for this submission, planned next:
- **Automated defect ticketing (Jira)** — open a prioritized bug (assignee, severity, PoC + evidence links) on approval. A working prototype already exists (`pentests/src/integrations/jira.ts` + the `file_jira_ticket` MCP tool); it's parked behind the approval step pending live Jira credentials and is not part of the current demo.
- **Live `regenerate` Layer 1** via Claude Code on the PR diff (the heuristic analyzer ships today).
- **Permanent MCP endpoint** (named cloudflared tunnel / reserved domain / hosted deploy — no rotation, no per-run re-point) + MCP bearer in an Orchestrator Credential Asset.
- **Deploy webhook + Slack `/pentest`** triggers.
- **UiPath→GitHub commit-status callback** — let the UiPath run set the PR check directly to block the merge. *(The PR→UiPath trigger + run + evidence are already live; today the GitHub Action does the merge-blocking.)*

## Security & scope

- The target app is a **purpose-built test fixture** — the only thing Penetron attacks in the demo.
- Penetron is for **authorized testing of owned, non-production environments** only.
- Secrets (MCP bearer, Test Manager client secret, Slack webhook) are read from env / Orchestrator Assets and
  are **git-ignored**; never commit `.env`.

## License

[MIT](LICENSE).
