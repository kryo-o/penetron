# Penetron — Agentic Penetration Testing, Governed by UiPath

> **SAST tools drown teams in unproven findings. Penetron reports only what it has actually exploited.**
> Static analysis proposes *candidates*; a dynamic agent **proves or discards** each one against the running app,
> then UiPath orchestrates, governs, and records the evidence. *"Flagged 7 → proved 6, discarded 1."*

Penetron shifts security from a late-stage manual checkpoint into a continuous, **governed gate** in the SDLC.
On a deploy to dev/QA/staging it analyzes the change, **proves exploitability** against the running app,
reports only the vulnerabilities it actually exploited, syncs red/green evidence to **UiPath Test Manager**,
and (gated behind a human approval) notifies Slack — all orchestrated by **UiPath Maestro**. *(Automated defect ticketing, e.g. Jira, is on the [v2 roadmap](#roadmap-v2).)*

Built for the **UiPath AgentHack — Track 3** (agentic software testing with UiPath Test Cloud).

> ⚠️ **Authorized, defensive security testing only.** Penetron runs against an **owned, intentionally-vulnerable
> demo app** in a non-production environment. That target app must **never** be deployed to production or exposed
> publicly. All secrets live in environment variables / Orchestrator Assets — never hardcoded.

---

## What it does (the flow)

```
deploy / trigger
  → UiPath Maestro (BPMN · orchestration · governance · audit)
     → Layer 1  Claude Code SAST + PR impact analysis      → candidate findings
     → Layer 2  Agent Builder agent → Penetron MCP →        → proven verdicts
                TS/Playwright exploit validation               + Test Manager evidence
     → Exploitability gate  (only exploited == true advances)
     → Two reports  (Exploitable Vulnerabilities · Suggested Improvements)
     → Human approval  (governance checkpoint)
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
| **Action Center** | Human approval (User Task) before any external write *(in progress — see Status)*. |

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
| **Test Manager S2S sync** | ✅ LIVE | tenant `hackathon26_879`, project **PEN**; executions `f689d631…`, `fe3f6e8d…` (6 Failed / 1 Passed) |
| **Remote MCP server** (7 tools, stateful, dual-auth) | ✅ LIVE | `npm run mcp:http`; agent calls it through a cloudflared tunnel |
| **Agent Builder coordinator → MCP** | ✅ LIVE | Debug run ~48s → real exploits → TM execution |
| **Maestro process published + run green** | ✅ LIVE | solution v1.0.3; instance: Start → Validate exploits (48s) → End, Successful; `content = OPEN_TICKET` |
| Action Center human approval | 🟡 | app built; blocked on tenant AppTasks provisioning — see `PROJECT-PLAN.md` (M8e) |
| Triggers (deploy webhook + Slack `/pentest`) | ⏳ | planned (M9) |

See [`PROJECT-PLAN.md`](PROJECT-PLAN.md) for the full milestone tracker and [`docs/architecture.md`](docs/architecture.md)
for the design.

---

## Run it locally

Requires Node 20+ (tested on Node 24).

```bash
# 1) Target app (intentionally vulnerable) — http://localhost:4000
cd target-app && npm install && npm run build:client && npm start

# 2) Prove the planted bugs fire (another shell)
cd target-app && npm run smoke                 # 8 passed, 0 failed

# 3) Penetron Layer 2 + gate + reports + integrations
cd pentests && npm install && npm run pw:install
npm run exploit      # 6/7 proven exploitable, 1 safe control resists
npm run report       # exploitability gate -> OPEN_TICKET + two reports
npm run pipeline     # exploit -> report -> Test Manager sync -> Slack notify
```

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

### Run the Remote MCP server (the UiPath bridge)

```bash
cd pentests
cp .env.example .env       # set PENETRON_MCP_TOKEN, PENETRON_MCP_ALLOWED_ACCOUNT, TM creds
npm run mcp:http           # stateful Streamable HTTP on :7337/mcp
npm run mcp:smoke:http     # -> HTTP MCP smoke OK
# expose with a tunnel for the cloud agent:  cloudflared tunnel --url http://localhost:7337 --protocol http2
```

---

## Repo layout

```
penetron/
├── target-app/        # intentionally-vulnerable Node/Express + React app + VULNS.md (ground truth)
├── engine/            # contract JSON schemas (finding · attack-surface · verdict) + Layer 1 replay output
├── pentests/          # TypeScript + Playwright exploit engine, gate, reports, integrations, MCP server
│   └── src/mcp/       # Remote MCP server (server.ts) + 7 tool implementations (tools.ts)
├── uipath/            # Maestro process spec, Agent Builder agent spec, MCP registration notes
└── docs/              # architecture, demo script, coding-agent evidence, integration plan
```

## Roadmap (v2)

Out of scope for this submission, planned next:
- **Automated defect ticketing (Jira)** — open a prioritized bug (assignee, severity, PoC + evidence links) on approval. A working prototype already exists (`pentests/src/integrations/jira.ts` + the `file_jira_ticket` MCP tool); it's parked behind the approval step pending live Jira credentials and is not part of the current demo.
- **Live `regenerate` Layer 1** via Claude Code on the PR diff (the heuristic analyzer ships today).
- **Stable named tunnel** + MCP bearer in an Orchestrator Credential Asset.
- **Deploy webhook + Slack `/pentest`** triggers.

## Security & scope

- The target app is a **purpose-built test fixture** — the only thing Penetron attacks in the demo.
- Penetron is for **authorized testing of owned, non-production environments** only.
- Secrets (MCP bearer, Test Manager client secret, Slack webhook) are read from env / Orchestrator Assets and
  are **git-ignored**; never commit `.env`.

## License

[MIT](LICENSE).
