# Penetron — ≤5-Minute Demo Script (run-of-show)

Goal: show Penetron **running on UiPath Automation Cloud** — an agent proving real exploits, the gate filtering
noise, and red/green evidence in Test Manager. Target ~4:30 to leave margin.

## Pre-flight (before recording)
- [ ] Target app up: `http://localhost:4000` (`cd target-app && npm start`)
- [ ] MCP server up: `cd pentests && npm run mcp:http` (terminal visible — it's great B-roll)
- [ ] Tunnel up: `cloudflared tunnel --url http://localhost:7337 --protocol http2`
- [ ] UiPath Orchestrator → Solution → MCP Servers → `Penetron-MCP` → Remote URL = `<tunnel>/mcp` (verify 7 tools)
- [ ] Browser tabs ready: (1) Studio Web `Penetron Security Gate` process, (2) Test Manager PEN dashboard
- [ ] Optional: pre-run once so the dashboard already has a prior execution to contrast

## Run of show

**[0:00–0:35] The problem & thesis**
> "Security tools flag hundreds of *possible* vulnerabilities — teams drown in unproven findings. Penetron is
> different: it reports **only what it actually exploited**. Static analysis proposes candidates; an agent proves
> or discards each one against the running app — and UiPath governs the whole thing."

Show the one-liner: *"Flagged 7 → proved 6, discarded 1."*

**[0:35–1:10] The target & the gap**
- Show `target-app/VULNS.md` — 6 planted OWASP bugs (SQLi, reflected/stored XSS, IDOR, broken-auth) + 1 safe control.
- "This is an owned, intentionally-vulnerable staging app — the only thing we attack."

**[1:10–2:30] The hero run — UiPath Maestro on the cloud**
- Open the **Maestro process** `Penetron Security Gate` in Studio Web. Walk the shape:
  Start → **Validate exploits (Agent Builder)** → exploitability gate.
- Hit **Debug on cloud**. While it runs (~48s), narrate the architecture:
  > "The Maestro process invokes a UiPath **Agent Builder** agent. The agent calls Penetron's **Remote MCP server**,
  > which runs real Playwright/HTTP exploits against the app."
- Cut to the **MCP server terminal**: show `tools/call` firing (run_exploits → generate_reports → get_gate → sync_test_manager).

**[2:30–3:20] The verdict & the gate**
- Back to the trace: **Validate exploits — 48s ✅**, and the **global variable `content`**:
  `{ "decision": "OPEN_TICKET", "exploitedCount": 6, "discardedCount": 1, "jiraPriority": "Highest" }`.
  > "The agent proved 6 and **discarded 1** — the safe control. The gate decision is OPEN_TICKET."

**[3:20–4:10] The evidence — Test Manager (the Track-3 footprint)**
- Open the **Test Manager PEN dashboard**. Show the new execution: **6 Failed (exploited) / 1 Passed (resisted)**.
  > "Every proven exploit is a red test result; the safe control is green. Test Manager is the system of record —
  > the red/green exploit locker, with screenshots and traces attached."

**[4:10–4:40] Governance & close**
- Show the two reports (Exploitable Vulnerabilities + Suggested Improvements) and the gated Jira/Slack writes.
  > "Before anything is filed, a human approves — UiPath Action Center. Then Jira gets a prioritized bug and Slack
  > a summary. Maestro keeps the full audit trail."
- Close on the thesis: *"Penetron proves exploitability, filters the noise, and lets UiPath govern the fix."*

## Coding-agent bonus (optional 20s or mention in description)
> "Claude Code is Penetron's brain **and** built the whole thing — the engine, the MCP server, and it drove the
> UiPath GUI to deploy the Maestro process." (Point to `docs/coding-agent-evidence/`.)

## Backup if the live tunnel flaps mid-record
- trycloudflare quick tunnels occasionally drop ~1s. If a run 502s, just re-run.
- Have a pre-recorded green run (instance trace + TM dashboard) as insurance B-roll.
