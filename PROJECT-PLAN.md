# Penetron — Project Plan & Milestones

> Living tracker of what's done vs. not. For full design rationale see the approved plan at
> `~/.claude/plans/i-am-building-penetron-ethereal-nygaard.md`. Last updated: 2026-06-20.

## What & why
- **Penetron** — an agentic penetration-testing gate. On a deploy to dev/QA/staging it analyzes the change,
  **proves exploitability** against the running app, reports **only what it actually exploited**, and
  notifies Slack — all orchestrated and governed by UiPath. *(Automated defect ticketing, e.g. Jira, is v2.)*
- **Event** — UiPath AgentHack **Track 3** (agentic testing with Test Cloud). **Deadline: 2026-06-29.**
- **Differentiator** — SAST proposes *candidates*; a dynamic agent *proves or discards* each one.
  _"Flagged 7 → proved 6, discarded 1."_
- **Bonus** — Claude Code (via UiPath for Coding Agents) is the analysis/exploit brain; Playwright drives the browser.

## Architecture
```
deploy / Slack trigger
   → UiPath Maestro (BPMN · governance · audit)
      → Layer 1  Claude Code SAST + PR impact analysis      → candidate findings
      → Layer 2  TS/Playwright exploit validation           → proven verdicts + Test Manager evidence
      → Exploitability gate (only exploited == true advances)
      → Two reports (Exploitable Vulns · Suggested Improvements)
      → Human approval (Action Center)
      → Slack notification (automated defect ticketing → v2 roadmap)
```

## Status legend
✅ done & verified · 🟢 done (dry-run; live needs creds) · 🟡 in progress · ⏳ pending · ⛔ blocked (awaiting UiPath access)

> **UiPath access landed 2026-06-24** — tenant `hackathon26_879` / `DefaultTenant`. Test Manager S2S connection verified live (M7 ✅). Connection facts in `docs/uipath-integration-plan.md` + `.env`.

## ▶ NEXT SESSION — start here (as of 2026-06-24 end of day)
**Biggest win so far:** the full cloud spine works LIVE — a UiPath Agent Builder agent ("Penetron Coordinator", claude-sonnet-4-6) calls Penetron via Remote MCP through a cloudflared tunnel, runs real exploits, and writes 6🔴/1🟢 evidence to Test Manager (project PEN). Proven via agent Debug run.

**Bring the stack back up first:** `./scripts/start-stack.sh` → it prints a NEW cloudflared URL (trycloudflare rotates each run) → update UiPath **Orchestrator → MCP Servers → Penetron → Remote URL = `<new>/mcp`** → in the agent, **Refresh tools**. Details in memory `penetron-demo-stack.md`.

**Maestro process "Penetron Security Gate"** (in Solution "Penetron", same place as the agent) is built as: `Start → Validate exploits (Coordinator agent) → Exclusive gateway [cond: vars.content.includes("OPEN_TICKET")] → (OPEN_TICKET → End) / (default path → End)`. The Action Center approval node was REMOVED tonight (it needs a real Action app — a GUI detour). Was at 0–1 validation issues; user finishing the last 2 clicks (delete approval + add End on the OPEN_TICKET branch).

**To resume M8, in priority order:**
1. **Publish + Debug the Maestro process** end-to-end (it calls the agent → which calls Penetron MCP). Confirm a new TM execution appears.
2. **Re-add Action Center approval (M8e)** between gateway and the writes — build a minimal Action app (Approve/Reject) showing `vars.content`. This is the governance highlight.
3. **Add Jira + Slack after approval** — MCP tools `file_jira_ticket` + `notify_slack` already exist on the server; call them via Maestro "Tools" tasks or a small notifier agent. (Need real Jira/Slack creds in `.env` for live; dry-run otherwise.)
4. **Harden for recording:** stable named cloudflared tunnel (URL stops rotating) + move MCP bearer to an Orchestrator **Credential Asset** (M8b).
5. Then **M9 triggers** + **M10 packaging** (README, deck, ≤5-min video, evidence).

**Playwright MCP for browser control:** `.mcp.json` is created (official `@playwright/mcp`). To let Claude drive the UiPath GUI directly (end the screenshot loop), run `/mcp` (or restart claude) to load+approve it, then handle the one-time UiPath Google login in the controlled (headed) browser. Deferred to 2026-06-25 per user.

## Milestones
| # | Milestone | Status | Evidence / notes |
|---|-----------|--------|------------------|
| M1 | Vulnerable target app (Express + React, single origin) | ✅ | `npm run smoke` → 8/8 exploits fire, safe control resists |
| M2 | Contract schemas (finding · attack-surface · verdict) | ✅ | `engine/schemas/*`; verdicts validate (ajv 2020-12) |
| M3 | Layer 2 exploit runner (TS + Playwright, replay) | ✅ | `npm run exploit` → 6/7 proven, 1 discarded; Chromium XSS; screenshots + traces |
| M4 | Exploitability gate + two reports | ✅ | `npm run report` → gate-summary `OPEN_TICKET`; Report A + Report B |
| M5 | Slack integration (Jira ticketing → v2) | ✅ | `npm run slack` → Block Kit summary posts LIVE to channel. Jira prototype (`npm run jira`, ADF Bug) parked for v2. |
| M6a | Layer 1 replay output (candidates + attack surface) | ✅ | `engine/replay/candidate-findings.json` |
| M6b | Layer 1 SAST + change-impact (diff-driven) | ✅ | `pentests/src/layer1/analyze.ts` (`npm run layer1`) — reads the PR diff, emits candidate-findings + attack-surface scoped to the change; feeds Layer 2 regenerate (`npm run exploit:pr`). Verified diff-scoped (1 file changed → 1 candidate). Heuristic rules now; Claude Code can back the same contract. |
| M11 | Playwright Agent CLI (`@playwright/cli`) wired | 🟡 | skill at `.claude/skills/playwright-cli`; powers regenerate live-drive |
| M7 | Test Manager S2S sync (Test Cloud evidence) | ✅ | `npm run tm:sync` → LIVE on tenant `hackathon26_879`; project PEN; execution 6 Failed (exploited) / 1 Passed (safe control); `evidence/tm-sync-result.json` |
| M8c | Penetron Remote MCP server (D1 bridge) | ✅ | `npm run mcp` (stdio) / `npm run mcp:http` (**stateful**, dual-auth: bearer OR org-id header). 7 tools: run_exploits, generate_reports, get_gate, sync_test_manager, run_full_pipeline, **file_jira_ticket, notify_slack**; `npm run mcp:smoke` / `mcp:smoke:http` pass |
| M8d-agent | Agent Builder "Penetron Coordinator" → Remote MCP | ✅ | LIVE: agent (claude-sonnet-4-6, temp 0, static prompt) calls Penetron via Remote MCP through cloudflared tunnel; Debug run Successful (48s); created TM execution 693afa33 (1 pass/6 fail). Published into Solution "Penetron". |
| M8d-maestro | Maestro BPMN "Penetron Security Gate" | ✅ | PUBLISHED (Penetron solution v1.0.3) + ran LIVE green (2026-06-25): Start→Validate exploits(agent, 48s)→End, status Successful; agent drove real exploits via MCP → `content=OPEN_TICKET` (6 exploited/1 discarded) → new TM execution `f689d631-7511-0c00-9ad6-0b49d00e1878` (6 Failed/1 Passed). Gateway+approval temporarily removed for the green run (see M8e). See uipath/maestro/penetron-process.md |
| M8e | Action Center approval (Human Task) | ⛔ | Built SimpleApprovalApp (Simple Approval template, Content=vars.content). BLOCKED: Maestro "Create action app task" → **AppTasks request 404 NotFound** (Action Center not reachable/provisioned for the debug identity in Solution folder). Bypassed for the green run. Alt path to try: User task supports Email/Slack/Teams delivery channels (not just Action Center) — may sidestep the 404. |
| M8b | Orchestrator External App + Credential Assets | ⏳ | move MCP bearer + Jira/Slack secrets to Assets; for hardened auth + automated job start |
| M8 | UiPath Maestro + Agent Builder + `uip` deploy | 🟡 | agent↔Penetron LIVE; Maestro shape built; remaining: approval app, Jira/Slack, stable tunnel, deploy · plan → `docs/uipath-integration-plan.md` |
| M9 | Triggers (PR Action ✅ · deploy webhook + Slack `/pentest` ⏳) | 🟢 | `.github/workflows/penetron-pr.yml` — on PR touching target-app: Layer 1 → Layer 2 → PR comment + evidence artifact + optional Maestro start. Deploy webhook + Slack slash still pending. |
| M10 | Local "insurance" orchestrator (full flow, no UiPath) | ⏳ | optional demo safety net |
| M12 | Packaging: README · deck · demo video · evidence | ⏳ | required deliverables |

## Verified now — run it locally
```bash
# 1) target app
cd target-app && npm install && npm run build:client && npm start      # http://localhost:4000
# 2) prove the planted bugs (another shell)
npm run smoke                                                          # 8 passed, 0 failed
# 3) Penetron Layer 2 + gate + reports + integrations
cd ../pentests && npm install && npm run pw:install
npm run pipeline      # exploit (6/7) → reports → Test Manager sync → Slack notify
```
Artifacts land in `pentests/evidence/`: `verdicts.json`, `exploitable-vulnerabilities.md`,
`suggested-improvements.md`, `gate-summary.json`, XSS screenshots + traces, `jira-payload.json`, `slack-message.json`.

## Parked — awaiting UiPath access (Test Cloud · Maestro · Agent Builder)
M7 (Test Manager sync), M8 (Maestro process + Agent Builder coordinator + `uip` deploy + Action Center approval),
and M9's public webhook wiring. Anything buildable tenant-free (Test Manager sync with dry-run, deploy scripts,
the BPMN/agent specs) will be staged so it's ready to deploy the moment access lands.

## Open questions (to resolve next)
1. **Regenerate mode** — Claude generates scenarios, `@playwright/cli` live-drive, or both? (leaning: both, replay default)
2. **Run host** — laptop / GitHub Actions / UiPath robot, i.e. where `claude` + `@playwright/cli` live (the Pattern-1 bridge).
3. **Fix-PR write-back** (coding agent opens a remediation PR) — in scope?
4. **Local insurance orchestrator** — build it as a demo safety net?

## Playwright Agent CLI — how it integrates
- Package `@playwright/cli` → binary `playwright-cli` (Node 20+; we have 24). Skill installed to `.claude/skills/playwright-cli/SKILL.md` via `playwright-cli install --skills`.
- Live-drive commands Penetron uses: `open`/`goto`, `fill`/`click`/`type`, **`eval`** (prove the XSS window-marker executed), `snapshot` (read DOM refs), **`state-save`/`state-load`** (carry an auth session for IDOR), `screenshot` (evidence). Persistent browser via `playwright-cli -s=penetron …` or `PLAYWRIGHT_CLI_SESSION=penetron claude .`.
- Role: powers **regenerate mode** — Claude Code discovers/confirms exploits live in the browser and emits the same `exploit-verdict` schema as the deterministic runner, so the gate → reports → Jira path is unchanged. The committed `playwright` library runner remains the replay/CI/evidence path.
